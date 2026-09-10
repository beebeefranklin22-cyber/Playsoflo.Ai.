import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireUser } from './_lib/auth.js';
import { retrievePaymentIntent } from './_lib/stripe.js';

// Backs secureBalanceUpdate (action: 'transfer'), processWithdrawal
// (action: 'withdraw'), and payMoneyRequest (action: 'pay_request'). All
// money movement goes through the wallet_move() Postgres function
// (supabase/migrations/0002_wallet_and_checkout.sql), which atomically
// checks-and-updates balances so concurrent requests can't overdraw an
// account. The caller's identity always comes from their verified auth
// token, never from a request body field.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const admin = getSupabaseAdmin();
  const { action } = req.body || {};

  try {
    if (action === 'transfer') {
      return res.status(200).json(await handleTransfer(admin, user, req.body));
    }
    if (action === 'withdraw') {
      return res.status(200).json(await handleWithdraw(admin, user, req.body));
    }
    if (action === 'pay_request') {
      return res.status(200).json(await handlePayRequest(admin, user, req.body));
    }
    if (action === 'credit_from_payment') {
      return res.status(200).json(await handleCreditFromPayment(admin, req.body));
    }
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('wallet action error:', action, err);
    return res.status(400).json({ success: false, error: cleanPgError(err.message) });
  }
}

async function handleTransfer(admin, user, body) {
  const amount = Number(body.amount);
  // Optional: for a purchase where the platform keeps a cut, credit_amount
  // can be less than amount (the debit) — e.g. a $10 tip debits the sender
  // $10 but only credits the creator $8.50 after a 15% platform fee. Plain
  // peer transfers (send money, tips-in-full) omit this and debit==credit.
  const creditAmount = body.credit_amount != null ? Number(body.credit_amount) : amount;
  const recipientEmail = body.recipient_email;
  if (!amount || amount <= 0) throw new Error('amount must be a positive number');
  if (creditAmount < 0 || creditAmount > amount) throw new Error('credit_amount cannot exceed amount');
  if (!recipientEmail) throw new Error('recipient_email is required');
  if (recipientEmail === user.email) throw new Error('You cannot send money to yourself');

  const { data, error } = await admin.rpc('wallet_move', {
    p_from_email: user.email,
    p_to_email: recipientEmail,
    p_debit_amount: amount,
    p_credit_amount: creditAmount,
    p_reference_type: body.reference_type || 'transfer',
    p_reference_id: body.reference_id || null,
    p_memo: body.memo || null,
  });
  if (error) throw error;
  return { success: true, ...data };
}

async function handleWithdraw(admin, user, body) {
  const amount = Number(body.amount);
  const method = body.method === 'instant' ? 'instant' : 'bank';
  if (!amount || amount <= 0) throw new Error('amount must be a positive number');
  if (!body.payment_method_id) throw new Error('payment_method_id is required');

  const fee = method === 'instant' ? 0.5 : 0;
  const total = Number((amount + fee).toFixed(2));

  const { error: moveError } = await admin.rpc('wallet_move', {
    p_from_email: user.email,
    p_to_email: null,
    p_debit_amount: total,
    p_credit_amount: null,
    p_reference_type: 'withdrawal',
    p_reference_id: body.payment_method_id,
    p_memo: `${method} withdrawal`,
  });
  if (moveError) throw moveError;

  // Real bank transfer requires Stripe Connect payouts, not configured yet
  // — this queues the request with the balance already deducted so it can
  // be fulfilled (and reconciled) once Connect is set up.
  const { data: payout, error: insertError } = await admin
    .from('payout_requests')
    .insert({
      user_email: user.email,
      amount,
      fee_amount: fee,
      net_amount: amount,
      method,
      payment_method_id: body.payment_method_id,
      status: 'pending_manual',
    })
    .select()
    .single();
  if (insertError) throw insertError;

  return { success: true, payout_request_id: payout.id };
}

async function handlePayRequest(admin, user, body) {
  const requestId = body.request_id;
  if (!requestId) throw new Error('request_id is required');

  const { data: request, error: fetchError } = await admin
    .from('payment_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (fetchError || !request) throw new Error('Payment request not found');
  if (request.payer_email !== user.email) throw new Error('This request is not addressed to you');
  if (request.status !== 'pending') throw new Error(`This request is already ${request.status}`);

  const { error: moveError } = await admin.rpc('wallet_move', {
    p_from_email: user.email,
    p_to_email: request.requester_email,
    p_debit_amount: request.amount,
    p_credit_amount: request.amount,
    p_reference_type: 'payment_request',
    p_reference_id: requestId,
    p_memo: request.note || null,
  });
  if (moveError) throw moveError;

  const { error: updateError } = await admin
    .from('payment_requests')
    .update({ status: 'paid', responded_at: new Date().toISOString() })
    .eq('id', requestId);
  if (updateError) throw updateError;

  return { success: true };
}

// Credits a creator's wallet after a Stripe-paid tip/purchase (e.g.
// livestream tipping) — a pure credit funded by real money already
// collected via Stripe, not an internal transfer. Deliberately does NOT
// require the caller to be the recipient: the tipper is the one whose
// browser confirms the Stripe payment and calls this, but the money goes
// to recipient_email. Re-verifies the PaymentIntent with Stripe itself
// (never trusts the client's amount or success claim) and is idempotent
// on payment_intent_id so a retry or double-click can't double-credit.
async function handleCreditFromPayment(admin, { payment_intent_id, recipient_email, reference_type, fee_rate }) {
  if (!payment_intent_id) throw new Error('payment_intent_id is required');
  if (!recipient_email) throw new Error('recipient_email is required');

  const { data: existing } = await admin
    .from('wallet_transactions')
    .select('id')
    .eq('reference_id', payment_intent_id)
    .eq('reference_type', reference_type || 'stripe_credit')
    .limit(1)
    .maybeSingle();
  if (existing) return { success: true, already_processed: true };

  const intent = await retrievePaymentIntent(payment_intent_id);
  if (intent.status !== 'succeeded') throw new Error(`Payment not completed (status: ${intent.status})`);

  const grossAmount = intent.amount / 100;
  const rate = Number.isFinite(fee_rate) ? fee_rate : 0.1;
  const creditAmount = Math.round(grossAmount * (1 - rate) * 100) / 100;

  const { error: moveError } = await admin.rpc('wallet_move', {
    p_from_email: null,
    p_to_email: recipient_email,
    p_debit_amount: null,
    p_credit_amount: creditAmount,
    p_reference_type: reference_type || 'stripe_credit',
    p_reference_id: payment_intent_id,
    p_memo: null,
  });
  if (moveError) throw moveError;

  return { success: true, credited: creditAmount };
}

function cleanPgError(message) {
  if (!message) return 'Wallet operation failed';
  if (message.includes('insufficient balance')) return 'Insufficient balance';
  if (message.includes('sender profile not found')) return 'Your profile could not be found';
  if (message.includes('recipient profile not found')) return 'Recipient not found';
  return message;
}

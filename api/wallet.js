import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireUser } from './_lib/auth.js';

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

function cleanPgError(message) {
  if (!message) return 'Wallet operation failed';
  if (message.includes('insufficient balance')) return 'Insufficient balance';
  if (message.includes('sender profile not found')) return 'Your profile could not be found';
  if (message.includes('recipient profile not found')) return 'Recipient not found';
  return message;
}

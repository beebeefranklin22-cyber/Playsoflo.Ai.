import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';
import { retrievePaymentIntent, retrieveConnectedAccount, createConnectTransfer, createConnectPayout } from '../_lib/stripe.js';
import { CREDIT_FEE_RATES } from '../_lib/orderHelpers.js';

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
    if (action === 'purchase') {
      return res.status(200).json(await handlePurchase(admin, user, req.body));
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

const MIN_WITHDRAWAL_AMOUNT = 1;

async function handleWithdraw(admin, user, body) {
  const amount = Number(body.amount);
  const method = body.method === 'instant' ? 'instant' : 'bank';
  if (!amount || amount < MIN_WITHDRAWAL_AMOUNT) throw new Error(`Minimum withdrawal is $${MIN_WITHDRAWAL_AMOUNT}`);
  if (!body.payment_method_id) throw new Error('payment_method_id is required');

  // A saved card or a Cash App/Venmo/PayPal username isn't a real payout
  // rail -- the client-side selectors already restrict to bank_account, but
  // this is the actual boundary: without it, a direct API call could queue
  // a "withdrawal" against a destination the manual-fulfillment team has no
  // way to actually pay out to.
  const { data: payoutMethod, error: pmError } = await admin
    .from('payment_methods')
    .select('id, type')
    .eq('id', body.payment_method_id)
    .eq('user_email', user.email)
    .eq('status', 'active')
    .single();
  if (pmError || !payoutMethod) throw new Error('Payout method not found');
  if (payoutMethod.type !== 'bank_account') throw new Error('Withdrawals can only be sent to a linked bank account');

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

  // Try a real payout via Stripe Connect if this user has a connected
  // account that's actually ready to receive payouts. Falls back to the
  // pending_manual queue (unchanged from before) if they haven't connected
  // one yet, or if the real attempt itself fails for any reason -- the
  // wallet balance is already debited at this point either way, so a
  // failure here must never be silently lost, only queued for a human to
  // sort out.
  let payoutStatus = 'pending_manual';
  let stripeTransferId = null;
  let stripePayoutId = null;
  let failureReason = null;

  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_account_id')
    .eq('email', user.email)
    .maybeSingle();

  if (profile?.stripe_account_id) {
    try {
      const account = await retrieveConnectedAccount(profile.stripe_account_id);
      if (account.payouts_enabled) {
        const amountCents = Math.round(amount * 100);
        const transfer = await createConnectTransfer({
          amountCents,
          destinationAccountId: profile.stripe_account_id,
          referenceId: body.payment_method_id,
          description: `${method} withdrawal for ${user.email}`,
        });
        stripeTransferId = transfer.id;

        const payoutResult = await createConnectPayout({
          amountCents,
          destinationAccountId: profile.stripe_account_id,
          description: `${method} withdrawal`,
        });
        stripePayoutId = payoutResult.id;
        payoutStatus = 'completed';
      } else {
        failureReason = 'Connected account not yet fully verified for payouts';
      }
    } catch (payoutError) {
      console.error('Real payout attempt failed for', user.email, payoutError);
      failureReason = payoutError.message;
    }
  }

  const { data: payout, error: insertError } = await admin
    .from('payout_requests')
    .insert({
      user_email: user.email,
      amount,
      fee_amount: fee,
      net_amount: amount,
      method,
      payment_method_id: body.payment_method_id,
      status: payoutStatus,
      stripe_transfer_id: stripeTransferId,
      stripe_payout_id: stripePayoutId,
      failure_reason: failureReason,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  return { success: true, payout_request_id: payout.id, status: payoutStatus };
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
async function handleCreditFromPayment(admin, { payment_intent_id, recipient_email, reference_type }) {
  if (!payment_intent_id) throw new Error('payment_intent_id is required');
  if (!recipient_email) throw new Error('recipient_email is required');

  const intent = await retrievePaymentIntent(payment_intent_id);
  if (intent.status !== 'succeeded') throw new Error(`Payment not completed (status: ${intent.status})`);

  // Defense in depth: if the PaymentIntent was created with a
  // recipient_email in its metadata (api/stripe-intent.js now stamps
  // created_by; tipping/purchase flows that pass recipient info at intent
  // creation do the same), refuse to credit a different email than the one
  // the charge was actually collected for.
  if (intent.metadata?.recipient_email && intent.metadata.recipient_email !== recipient_email) {
    throw new Error('This payment was not collected for that recipient');
  }

  // The fee rate is resolved server-side from reference_type, never trusted
  // from the client -- this used to accept a client-supplied fee_rate
  // directly, which let a tampered request (e.g. fee_rate: 0) take the
  // platform's cut on any of these purchase types to zero.
  const grossAmount = intent.amount / 100;
  const rate = CREDIT_FEE_RATES[reference_type] ?? 0.10;
  const creditAmount = Math.round(grossAmount * (1 - rate) * 100) / 100;

  // A single Stripe payment_intent_id must credit a wallet AT MOST ONCE,
  // full stop -- not once per (payment_intent_id, reference_type) pair.
  // reference_type is a client-supplied string, so keying the old
  // idempotency check on that pair let one real charge be credited an
  // unlimited number of times just by varying reference_type on repeat
  // calls. This ledger has a unique constraint on payment_intent_id alone
  // (migration 0020), and the insert is the atomic lock: if two requests
  // race, only one insert can win, closing the TOCTOU window a
  // check-then-move approach would leave open.
  const { error: ledgerError } = await admin
    .from('stripe_credit_ledger')
    .insert({ payment_intent_id, recipient_email, credited_amount: creditAmount, reference_type: reference_type || 'stripe_credit' });
  if (ledgerError) {
    if (ledgerError.code === '23505') return { success: true, already_processed: true };
    throw ledgerError;
  }

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

// A flat platform-sold purchase with no specific recipient -- a game shop
// item, a premium game subscription -- where the full amount is platform
// revenue rather than owed to another user, so there's no counterpart to
// credit (same debit-only shape as a withdrawal, minus the payout step).
async function handlePurchase(admin, user, body) {
  const amount = Number(body.amount);
  if (!amount || amount <= 0) throw new Error('amount must be a positive number');
  if (!body.reference_type) throw new Error('reference_type is required');

  const { error: moveError } = await admin.rpc('wallet_move', {
    p_from_email: user.email,
    p_to_email: null,
    p_debit_amount: amount,
    p_credit_amount: null,
    p_reference_type: body.reference_type,
    p_reference_id: body.reference_id || null,
    p_memo: body.memo || null,
  });
  if (moveError) throw moveError;
  return { success: true };
}

function cleanPgError(message) {
  if (!message) return 'Wallet operation failed';
  if (message.includes('insufficient balance')) return 'Insufficient balance';
  if (message.includes('sender profile not found')) return 'Your profile could not be found';
  if (message.includes('recipient profile not found')) return 'Recipient not found';
  return message;
}

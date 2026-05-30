import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Securely pays (or refunds) a PaymentRequest. The authenticated user MUST be the payer.
// Moves money from payer -> requester, marks the request as paid, and notifies both parties.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request_id } = await req.json();
    if (!request_id) {
      return Response.json({ error: 'request_id is required' }, { status: 400 });
    }

    // Load the request as service role (RLS already limits visibility, but we re-verify)
    let pr;
    try {
      pr = await base44.asServiceRole.entities.PaymentRequest.get(request_id);
    } catch {
      pr = null;
    }
    if (!pr) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    // Only the designated payer can pay
    if (pr.payer_email !== user.email) {
      return Response.json({ error: 'You are not authorized to pay this request' }, { status: 403 });
    }
    if (pr.status !== 'pending') {
      return Response.json({ error: `Request is already ${pr.status}` }, { status: 400 });
    }

    const amount = parseFloat(pr.amount);
    if (isNaN(amount) || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Fetch fresh balances
    const payers = await base44.asServiceRole.entities.User.filter({ email: pr.payer_email });
    const requesters = await base44.asServiceRole.entities.User.filter({ email: pr.requester_email });
    if (payers.length === 0 || requesters.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const payer = payers[0];
    const requester = requesters[0];

    const payerBalance = parseFloat(payer.usd_balance) || 0;
    if (payerBalance < amount) {
      return Response.json({ error: 'Insufficient balance', current_balance: payerBalance, required: amount }, { status: 400 });
    }

    const requesterBalance = parseFloat(requester.usd_balance) || 0;

    // Atomic transfer
    await base44.asServiceRole.entities.User.update(payer.id, { usd_balance: payerBalance - amount });
    await base44.asServiceRole.entities.User.update(requester.id, { usd_balance: requesterBalance + amount });

    const isRefund = pr.request_type === 'refund_request';
    const memo = isRefund
      ? `Refund to ${requester.full_name || pr.requester_email}${pr.note ? `: ${pr.note}` : ''}`
      : `Payment to ${requester.full_name || pr.requester_email}${pr.note ? `: ${pr.note}` : ''}`;

    await base44.asServiceRole.entities.Payment.create({
      amount_usd: amount,
      amount_rri: 0,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: isRefund ? 'refund' : 'transfer',
      sender_email: pr.payer_email,
      recipient_email: pr.requester_email,
      memo
    });

    await base44.asServiceRole.entities.PaymentRequest.update(pr.id, {
      status: 'paid',
      responded_at: new Date().toISOString()
    });

    // Notify the requester that they got paid
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: pr.requester_email,
      type: 'payment_received',
      title: isRefund ? '💸 Refund Received' : '💰 Request Paid',
      message: `${payer.full_name || pr.payer_email} sent you $${amount.toFixed(2)}${pr.note ? `: "${pr.note}"` : ''}`,
      sender_email: pr.payer_email,
      sender_name: payer.full_name,
      read: false
    });

    return Response.json({ success: true, amount, request_type: pr.request_type });
  } catch (error) {
    console.error('payMoneyRequest error:', error);
    return Response.json({ error: 'Operation failed', details: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipient_email, amount, memo } = await req.json();

    if (!recipient_email || !amount || amount <= 0) {
      return Response.json({ error: 'Invalid payment data' }, { status: 400 });
    }

    // Check sender balance
    if ((user.usd_balance || 0) < amount) {
      return Response.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Get recipient user
    const recipients = await base44.asServiceRole.entities.User.filter({ email: recipient_email });
    if (recipients.length === 0) {
      return Response.json({ error: 'Recipient not found' }, { status: 404 });
    }

    const recipient = recipients[0];

    // Update both balances atomically
    const senderNewBalance = (user.usd_balance || 0) - amount;
    const recipientNewBalance = (recipient.usd_balance || 0) + amount;

    await base44.asServiceRole.entities.User.update(user.id, {
      usd_balance: senderNewBalance
    });

    await base44.asServiceRole.entities.User.update(recipient.id, {
      usd_balance: recipientNewBalance
    });

    // Create payment record
    const payment = await base44.asServiceRole.entities.Payment.create({
      amount_usd: amount,
      amount_rri: 0,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'sent',
      sender_email: user.email,
      recipient_email: recipient_email,
      memo: memo || 'P2P transfer'
    });

    // Notify both parties
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: user.email,
      type: 'payment_received',
      title: '✅ Money Sent',
      message: `You sent $${amount.toFixed(2)} to ${recipient_email}. New balance: $${senderNewBalance.toFixed(2)}`,
      reference_type: 'payment',
      reference_id: payment.id
    });

    await base44.asServiceRole.entities.Notification.create({
      recipient_email: recipient_email,
      type: 'payment_received',
      title: '💰 Money Received',
      message: `You received $${amount.toFixed(2)} from ${user.email}. New balance: $${recipientNewBalance.toFixed(2)}`,
      reference_type: 'payment',
      reference_id: payment.id
    });

    return Response.json({
      success: true,
      payment_id: payment.id,
      new_balance: senderNewBalance,
      message: 'Payment sent successfully'
    });

  } catch (error) {
    console.error('P2P payment error:', error);
    return Response.json({ 
      error: 'Payment processing failed',
      details: error.message 
    }, { status: 500 });
  }
});
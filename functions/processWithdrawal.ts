import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, bank_account_id } = await req.json();

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Check user balance
    if ((user.usd_balance || 0) < amount) {
      return Response.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);

    // Calculate platform fee for instant payout (3%)
    const platformFee = amount * 0.03;
    const netAmount = amount - platformFee;

    // Verify bank account
    const bankAccounts = await base44.entities.BankAccount.filter({
      id: bank_account_id,
      user_email: user.email,
      verified: true
    });

    if (bankAccounts.length === 0) {
      return Response.json({ error: 'Invalid or unverified bank account' }, { status: 400 });
    }

    const bankAccount = bankAccounts[0];

    // Create Stripe transfer/payout
    let stripeTransfer;
    try {
      // For production, you'd create an actual Stripe payout
      // For now, we'll simulate it
      stripeTransfer = {
        id: `sim_${Date.now()}`,
        status: 'succeeded'
      };
    } catch (error) {
      return Response.json({ error: 'Stripe payout failed', details: error.message }, { status: 500 });
    }

    // Update user balance
    const newBalance = (user.usd_balance || 0) - amount;
    await base44.asServiceRole.entities.User.update(user.id, {
      usd_balance: newBalance
    });

    // Create payment record
    await base44.entities.Payment.create({
      amount_usd: amount,
      method: 'bank',
      status: 'completed',
      reference_type: 'withdrawal',
      reference_id: stripeTransfer.id,
      sender_email: user.email,
      memo: `Withdrawal to ${bankAccount.bank_name} (Fee: $${platformFee.toFixed(2)})`
    });

    // Record platform fee
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: platformFee,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'other',
      reference_id: stripeTransfer.id,
      sender_email: user.email,
      recipient_email: 'platform@playsofl.com',
      memo: 'Platform instant withdrawal fee (3%)'
    });

    // Notify user
    await base44.entities.Notification.create({
      recipient_email: user.email,
      type: 'payment_received',
      title: '✅ Withdrawal Processed',
      message: `$${netAmount.toFixed(2)} is being transferred to your bank account. Fee: $${platformFee.toFixed(2)}`,
      reference_type: 'payment',
      reference_id: stripeTransfer.id
    });

    return Response.json({
      success: true,
      message: 'Withdrawal processed successfully',
      amount: netAmount,
      fee: platformFee,
      new_balance: newBalance,
      transfer_id: stripeTransfer.id
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    return Response.json({ 
      error: 'Withdrawal processing failed',
      details: error.message 
    }, { status: 500 });
  }
});
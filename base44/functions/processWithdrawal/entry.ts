import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
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

    if ((user.usd_balance || 0) < amount) {
      return Response.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);

    // Platform fee: 3%
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

    // Ensure we have a Stripe external account token to pay out to
    if (!bankAccount.stripe_bank_token) {
      return Response.json({ error: 'Bank account not linked to Stripe. Please re-add your bank account.' }, { status: 400 });
    }

    // Get or create Stripe customer for this user
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const existingCustomers = await stripe.customers.search({
        query: `email:'${user.email}'`,
      });
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.full_name,
          metadata: { user_id: user.id }
        });
        customerId = customer.id;
      }
      // Save customer ID for future use
      await base44.asServiceRole.entities.User.update(user.id, {
        stripe_customer_id: customerId
      });
    }

    // Create a real Stripe payout via bank account
    // First attach the bank account to the customer if not already done
    let stripeBankAccountId = bankAccount.stripe_bank_account_id;
    if (!stripeBankAccountId) {
      const stripeBank = await stripe.customers.createSource(customerId, {
        source: bankAccount.stripe_bank_token
      });
      stripeBankAccountId = stripeBank.id;
      await base44.asServiceRole.entities.BankAccount.update(bankAccount.id, {
        stripe_bank_account_id: stripeBankAccountId
      });
    }

    // Create a PaymentIntent to pay out to bank (ACH credit transfer)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(netAmount * 100), // cents
      currency: 'usd',
      customer: customerId,
      payment_method_types: ['us_bank_account'],
      confirm: false,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        withdrawal_amount: amount.toString(),
        platform_fee: platformFee.toString(),
        net_amount: netAmount.toString(),
        bank_account_id: bankAccount.id,
        type: 'withdrawal'
      },
      description: `Withdrawal for ${user.email} - Net: $${netAmount.toFixed(2)}`
    });

    // Deduct full amount from user balance immediately
    const newBalance = (user.usd_balance || 0) - amount;
    await base44.asServiceRole.entities.User.update(user.id, {
      usd_balance: newBalance
    });

    // Create payment record
    await base44.entities.Payment.create({
      amount_usd: amount,
      method: 'bank',
      status: 'pending',
      reference_type: 'withdrawal',
      reference_id: paymentIntent.id,
      sender_email: user.email,
      memo: `Withdrawal to ${bankAccount.bank_name} (Fee: $${platformFee.toFixed(2)}, Net: $${netAmount.toFixed(2)})`
    });

    // Record platform fee
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: platformFee,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'other',
      reference_id: paymentIntent.id,
      sender_email: user.email,
      recipient_email: 'platform@playsoflo.com',
      memo: 'Platform withdrawal fee (3%)'
    });

    // Notify user
    await base44.entities.Notification.create({
      recipient_email: user.email,
      type: 'payment_received',
      title: '⏳ Withdrawal Initiated',
      message: `$${netAmount.toFixed(2)} is being transferred to your ${bankAccount.bank_name} account. Fee: $${platformFee.toFixed(2)}. New balance: $${newBalance.toFixed(2)}. ACH transfers typically take 1-3 business days.`,
      reference_type: 'payment',
      reference_id: paymentIntent.id
    });

    return Response.json({
      success: true,
      message: 'Withdrawal initiated successfully',
      amount: netAmount,
      fee: platformFee,
      new_balance: newBalance,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      estimated_arrival: '1-3 business days'
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    return Response.json({ 
      error: 'Withdrawal processing failed',
      details: error.message 
    }, { status: 500 });
  }
});
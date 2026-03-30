import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await req.json();

    if (!amount || amount < 1) {
      return Response.json({ error: 'Minimum payout is $1.00' }, { status: 400 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    console.log(`Processing payout for ${user.email}: $${amount}`);

    // Get all earnings for user
    const earnings = await base44.asServiceRole.entities.RoyaltyEarnings.filter({
      user_email: user.email
    });

    if (earnings.length === 0) {
      return Response.json({ error: 'No earnings found' }, { status: 404 });
    }

    // Check if user has Connect account and it's enabled
    const stripeAccountId = earnings[0].stripe_connect_account_id;
    if (!stripeAccountId) {
      return Response.json({ 
        error: 'Please connect your bank account first',
        needs_onboarding: true
      }, { status: 400 });
    }

    // Verify account is ready for payouts
    const account = await stripe.accounts.retrieve(stripeAccountId);
    if (!account.payouts_enabled) {
      return Response.json({ 
        error: 'Complete your bank account setup to receive payouts',
        needs_onboarding: true
      }, { status: 400 });
    }

    // Calculate total accumulated
    const totalAccumulated = earnings.reduce((sum, e) => sum + (e.accumulated_usd || 0), 0);

    if (amount > totalAccumulated) {
      return Response.json({ 
        error: `Insufficient earnings. Available: $${totalAccumulated.toFixed(2)}`,
        available: totalAccumulated
      }, { status: 400 });
    }

    // Create payout record
    const payout = await base44.asServiceRole.entities.RoyaltyPayout.create({
      user_email: user.email,
      amount_usd: amount,
      track_ids: earnings.map(e => e.track_id),
      status: 'processing',
      stripe_connect_account_id: stripeAccountId,
      payout_date: new Date().toISOString()
    });

    // Create Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      destination: stripeAccountId,
      description: `Royalty payout - ${new Date().toLocaleDateString()}`,
      metadata: {
        user_email: user.email,
        payout_id: payout.id
      }
    });

    // Update payout record
    await base44.asServiceRole.entities.RoyaltyPayout.update(payout.id, {
      status: 'paid',
      stripe_transfer_id: transfer.id
    });

    // Deduct from accumulated earnings (distribute proportionally)
    let remainingToPayout = amount;
    for (const earning of earnings) {
      if (remainingToPayout <= 0) break;
      
      const accum = earning.accumulated_usd || 0;
      if (accum > 0) {
        const deduction = Math.min(accum, remainingToPayout);
        await base44.asServiceRole.entities.RoyaltyEarnings.update(earning.id, {
          accumulated_usd: accum - deduction,
          last_payout_date: new Date().toISOString()
        });
        remainingToPayout -= deduction;
      }
    }

    // Send notification
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: user.email,
      type: "payment_received",
      title: "💸 Royalty Payout Sent",
      message: `$${amount.toFixed(2)} has been sent to your connected account. Funds typically arrive in 2-3 business days.`,
      read: false,
      action_url: "/CollaboratorDashboard"
    });

    console.log(`Payout completed: ${transfer.id}`);

    return Response.json({
      success: true,
      payout_id: payout.id,
      transfer_id: transfer.id,
      amount: amount,
      message: `$${amount.toFixed(2)} payout initiated successfully`
    });

  } catch (error) {
    console.error('Error processing payout:', error);
    
    // Log failed payout
    try {
      await base44.asServiceRole.entities.RoyaltyPayout.create({
        user_email: user.email,
        amount_usd: amount || 0,
        status: 'failed',
        error_message: error.message
      });
    } catch (logError) {
      console.error('Failed to log payout error:', logError);
    }

    return Response.json({ error: error.message }, { status: 500 });
  }
});
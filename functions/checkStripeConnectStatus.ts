import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    // Get user's earnings records
    const earnings = await base44.asServiceRole.entities.RoyaltyEarnings.filter({
      user_email: user.email
    });

    if (earnings.length === 0) {
      return Response.json({ 
        connected: false,
        message: 'No earnings records found'
      });
    }

    const stripeAccountId = earnings[0].stripe_connect_account_id;
    if (!stripeAccountId) {
      return Response.json({ 
        connected: false,
        needs_onboarding: true,
        message: 'No Stripe account connected'
      });
    }

    // Check account status
    const account = await stripe.accounts.retrieve(stripeAccountId);

    const isFullyOnboarded = account.details_submitted && account.payouts_enabled;

    // Update all earnings records with current status
    for (const earning of earnings) {
      await base44.asServiceRole.entities.RoyaltyEarnings.update(earning.id, {
        payout_enabled: isFullyOnboarded
      });
    }

    return Response.json({
      connected: true,
      account_id: account.id,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      charges_enabled: account.charges_enabled,
      requirements: account.requirements,
      fully_onboarded: isFullyOnboarded
    });

  } catch (error) {
    console.error('Error checking Stripe Connect status:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
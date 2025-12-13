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

    console.log(`Creating Stripe Connect account for ${user.email}`);

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        user_email: user.email,
        user_id: user.id
      }
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get('origin')}/CollaboratorDashboard?setup=refresh`,
      return_url: `${req.headers.get('origin')}/CollaboratorDashboard?setup=complete`,
      type: 'account_onboarding',
    });

    // Update all royalty earnings for this user
    const earnings = await base44.asServiceRole.entities.RoyaltyEarnings.filter({
      user_email: user.email
    });

    for (const earning of earnings) {
      await base44.asServiceRole.entities.RoyaltyEarnings.update(earning.id, {
        stripe_connect_account_id: account.id,
        payout_enabled: false // Will be enabled after onboarding
      });
    }

    console.log(`Connect account created: ${account.id}`);

    return Response.json({
      success: true,
      account_id: account.id,
      onboarding_url: accountLink.url
    });

  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import Stripe from 'npm:stripe@17.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: Authenticate User
    // ============================================
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ============================================
    // STEP 2: Initialize Stripe
    // ============================================
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ 
        error: 'STRIPE_SECRET_KEY not configured' 
      }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover'
    });

    // ============================================
    // STEP 3: Get Account ID
    // ============================================
    const accountId = user.stripe_connect_account_id;
    
    if (!accountId) {
      return Response.json({ 
        hasAccount: false,
        message: 'No connected account exists'
      });
    }

    // ============================================
    // STEP 4: Retrieve Account from Stripe
    // ============================================
    // Always fetch the latest account status from Stripe
    // Do NOT rely on cached/stored data for onboarding status
    const account = await stripe.accounts.retrieve(accountId);

    // ============================================
    // STEP 5: Parse Account Status
    // ============================================
    // Key properties to check:
    // - details_submitted: Has the user completed onboarding?
    // - charges_enabled: Can the account receive payments?
    // - payouts_enabled: Can the account receive payouts?
    
    return Response.json({
      hasAccount: true,
      accountId: account.id,
      
      // Onboarding status
      onboarding: {
        details_submitted: account.details_submitted,
        currently_due: account.requirements?.currently_due || [],
        eventually_due: account.requirements?.eventually_due || [],
        past_due: account.requirements?.past_due || []
      },
      
      // Payment capabilities
      capabilities: {
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled
      },
      
      // Account info
      info: {
        email: account.email,
        country: account.country,
        default_currency: account.default_currency,
        business_profile: account.business_profile
      },
      
      // Simple status indicator
      isFullyOnboarded: account.details_submitted && 
                        account.charges_enabled && 
                        account.payouts_enabled
    });

  } catch (error) {
    console.error('Error getting account status:', error);
    
    // Handle case where account was deleted
    if (error.code === 'account_invalid') {
      return Response.json({
        hasAccount: false,
        error: 'Account no longer exists',
        hint: 'Create a new connected account'
      });
    }
    
    return Response.json({ 
      error: error.message || 'Failed to get account status',
      type: error.type || 'unknown_error'
    }, { status: 500 });
  }
});
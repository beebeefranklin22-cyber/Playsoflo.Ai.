/**
 * Get Connected Account Status
 * 
 * Retrieves the current status of a Stripe connected account.
 * This is used to check if onboarding is complete and if account can accept charges.
 * 
 * Flow:
 * 1. Authenticate user
 * 2. Retrieve account from Stripe API
 * 3. Return detailed status information
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: AUTHENTICATE USER
    // ============================================
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ============================================
    // STEP 2: VALIDATE STRIPE CREDENTIALS
    // ============================================
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      return Response.json({ 
        error: 'Stripe API key not configured'
      }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover',
    });

    // ============================================
    // STEP 3: GET ACCOUNT ID FROM REQUEST
    // ============================================
    const url = new URL(req.url);
    const account_id = url.searchParams.get('account_id');
    
    if (!account_id) {
      return Response.json({ error: 'account_id query parameter is required' }, { status: 400 });
    }

    // ============================================
    // STEP 4: RETRIEVE ACCOUNT FROM STRIPE
    // ============================================
    /**
     * Retrieve account details directly from Stripe API
     * 
     * Key fields to check:
     * - charges_enabled: Can accept charges
     * - details_submitted: Has completed onboarding
     * - payouts_enabled: Can receive payouts
     * - requirements: Any pending information needed
     */
    const account = await stripe.accounts.retrieve(account_id);

    // ============================================
    // STEP 5: RETURN ACCOUNT STATUS
    // ============================================
    return Response.json({
      success: true,
      account_id: account.id,
      email: account.email,
      
      // Critical status flags
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      
      // Onboarding status
      requirements: {
        currently_due: account.requirements?.currently_due || [],
        eventually_due: account.requirements?.eventually_due || [],
        past_due: account.requirements?.past_due || [],
      },
      
      // Human-readable status
      status: account.charges_enabled ? 'active' : 'pending',
      can_accept_payments: account.charges_enabled && account.details_submitted,
    });

  } catch (error) {
    console.error('Get account status error:', error);
    
    // Handle account not found
    if (error.code === 'resource_missing') {
      return Response.json({ 
        error: 'Connected account not found',
        details: 'The specified account_id does not exist'
      }, { status: 404 });
    }
    
    return Response.json({ 
      error: 'Failed to retrieve account status',
      details: error.message 
    }, { status: 500 });
  }
});
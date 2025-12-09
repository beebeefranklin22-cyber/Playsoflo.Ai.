import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

/**
 * STRIPE CONNECT - GET ACCOUNT STATUS
 * 
 * This function retrieves the current status of a connected account
 * directly from Stripe (not from a database cache).
 * 
 * Key statuses to check:
 * - charges_enabled: Can the account accept payments?
 * - payouts_enabled: Can the account receive payouts?
 * - details_submitted: Has onboarding been completed?
 * - requirements: What info is still needed?
 * 
 * API Version: 2025-11-17.clover
 */

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
    // STEP 2: INITIALIZE STRIPE
    // ============================================
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      return Response.json({ 
        error: 'STRIPE_SECRET_KEY not configured' 
      }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover',
    });

    // ============================================
    // STEP 3: GET ACCOUNT ID
    // ============================================
    // Account ID can come from request body or user profile
    const body = await req.json().catch(() => ({}));
    const accountId = body.account_id || user.stripe_account_id;
    
    if (!accountId) {
      return Response.json({ 
        error: 'No connected account found for this user',
        action: 'Create a connected account first'
      }, { status: 404 });
    }

    // ============================================
    // STEP 4: RETRIEVE ACCOUNT FROM STRIPE
    // ============================================
    // Get the latest account information directly from Stripe
    const account = await stripe.accounts.retrieve(accountId);

    // ============================================
    // STEP 5: ANALYZE ACCOUNT STATUS
    // ============================================
    // Check if the account can accept charges
    const canAcceptPayments = account.charges_enabled;
    
    // Check if onboarding is complete
    const onboardingComplete = account.details_submitted;
    
    // Check if payouts are enabled
    const canReceivePayouts = account.payouts_enabled;
    
    // Get requirements - what still needs to be done
    const requirementsCurrentlyDue = account.requirements?.currently_due || [];
    const requirementsEventuallyDue = account.requirements?.eventually_due || [];
    const requirementsPastDue = account.requirements?.past_due || [];

    // ============================================
    // STEP 6: DETERMINE NEXT STEPS
    // ============================================
    let statusMessage = '';
    let nextAction = '';

    if (!onboardingComplete) {
      statusMessage = 'Onboarding not complete';
      nextAction = 'Create an account link to continue onboarding';
    } else if (requirementsPastDue.length > 0) {
      statusMessage = 'Action required - information past due';
      nextAction = 'Create an account link to update required information';
    } else if (requirementsCurrentlyDue.length > 0) {
      statusMessage = 'Action required - additional information needed';
      nextAction = 'Create an account link to complete requirements';
    } else if (!canAcceptPayments) {
      statusMessage = 'Under review';
      nextAction = 'Wait for Stripe to complete verification';
    } else {
      statusMessage = 'Active and ready to accept payments';
      nextAction = 'None - account is fully operational';
    }

    // ============================================
    // STEP 7: RETURN DETAILED STATUS
    // ============================================
    return Response.json({ 
      account_id: account.id,
      status: statusMessage,
      next_action: nextAction,
      
      // Payment capabilities
      charges_enabled: canAcceptPayments,
      payouts_enabled: canReceivePayouts,
      details_submitted: onboardingComplete,
      
      // Account details
      email: account.email,
      country: account.country,
      default_currency: account.default_currency,
      business_type: account.business_type,
      
      // Requirements
      requirements: {
        currently_due: requirementsCurrentlyDue,
        eventually_due: requirementsEventuallyDue,
        past_due: requirementsPastDue,
        disabled_reason: account.requirements?.disabled_reason,
      },
      
      // Controller info
      controller: {
        is_controller: account.controller?.is_controller,
        fees_payer: account.controller?.fees?.payer,
        losses_payer: account.controller?.losses?.payments,
        dashboard_type: account.controller?.stripe_dashboard?.type,
      },
      
      // Metadata
      metadata: account.metadata,
    });

  } catch (error) {
    console.error('Account status retrieval error:', error);
    return Response.json({ 
      error: error.message,
      hint: 'Verify the account_id is valid and belongs to your platform'
    }, { status: 500 });
  }
});
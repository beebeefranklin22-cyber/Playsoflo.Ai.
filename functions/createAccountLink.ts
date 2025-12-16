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
    // The account ID should be stored in the user record
    const accountId = user.stripe_connect_account_id;
    
    if (!accountId) {
      return Response.json({ 
        error: 'No connected account found for this user',
        hint: 'Create a connected account first'
      }, { status: 400 });
    }

    // ============================================
    // STEP 4: Get Current App URL for Redirects
    // ============================================
    // IMPORTANT: Replace this with your actual app URL
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:3000';
    
    // These URLs determine where users go after onboarding
    const returnUrl = `${appBaseUrl}/StripeConnectOnboarding?success=true`;
    const refreshUrl = `${appBaseUrl}/StripeConnectOnboarding`;

    // ============================================
    // STEP 5: Create Account Link
    // ============================================
    // Account Links are one-time use URLs for onboarding
    // They expire after a short time (usually 5 minutes)
    const accountLink = await stripe.accountLinks.create({
      // The connected account to onboard
      account: accountId,
      
      // Return URL after successful onboarding
      return_url: returnUrl,
      
      // Refresh URL if the link expires or there's an error
      refresh_url: refreshUrl,
      
      // Type of link - account_onboarding for initial setup
      type: 'account_onboarding'
    });

    // ============================================
    // STEP 6: Return the Onboarding URL
    // ============================================
    return Response.json({
      success: true,
      url: accountLink.url,
      expires_at: accountLink.expires_at,
      message: 'Onboarding link created successfully'
    });

  } catch (error) {
    console.error('Error creating account link:', error);
    return Response.json({ 
      error: error.message || 'Failed to create account link',
      type: error.type || 'unknown_error'
    }, { status: 500 });
  }
});
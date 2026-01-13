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
    // STEP 3: Parse Request Body
    // ============================================
    const body = await req.json();
    const { accountId, returnUrl, refreshUrl } = body;
    
    if (!accountId) {
      return Response.json({ 
        error: 'accountId is required',
        hint: 'Provide the Stripe account ID'
      }, { status: 400 });
    }

    if (!returnUrl || !refreshUrl) {
      return Response.json({ 
        error: 'returnUrl and refreshUrl are required'
      }, { status: 400 });
    }

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
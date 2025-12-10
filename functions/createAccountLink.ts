/**
 * Create Stripe Account Link for Onboarding
 * 
 * This function generates an onboarding link for a connected account.
 * The link redirects users through Stripe's hosted onboarding flow.
 * 
 * Flow:
 * 1. Authenticate user
 * 2. Validate Stripe account ID
 * 3. Generate account link with refresh and return URLs
 * 4. Return onboarding URL
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
        error: 'Stripe API key not configured. Please add STRIPE_SECRET_KEY to environment variables.'
      }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover',
    });

    // ============================================
    // STEP 3: PARSE REQUEST
    // ============================================
    const { account_id, refresh_url, return_url } = await req.json();
    
    if (!account_id) {
      return Response.json({ error: 'account_id is required' }, { status: 400 });
    }

    // ============================================
    // STEP 4: CREATE ACCOUNT LINK
    // ============================================
    /**
     * Account Link Configuration:
     * 
     * - account: Connected account ID to onboard
     * - refresh_url: Where to redirect if link expires (user needs new link)
     * - return_url: Where to redirect after successful onboarding
     * - type: 'account_onboarding' for initial setup
     */
    const accountLink = await stripe.accountLinks.create({
      account: account_id,
      
      // URL to redirect to if the link expires (happens after 5 minutes)
      refresh_url: refresh_url || `${new URL(req.url).origin}/stripe-connect-onboarding?refresh=true`,
      
      // URL to redirect to after successful onboarding
      return_url: return_url || `${new URL(req.url).origin}/stripe-connect-onboarding?success=true`,
      
      // Type of flow - account_onboarding for initial setup
      type: 'account_onboarding',
    });

    // ============================================
    // STEP 5: RETURN ONBOARDING URL
    // ============================================
    return Response.json({
      success: true,
      url: accountLink.url,
      expires_at: accountLink.expires_at,
      message: 'Redirect user to this URL to complete onboarding'
    });

  } catch (error) {
    console.error('Create account link error:', error);
    return Response.json({ 
      error: 'Failed to create account link',
      details: error.message 
    }, { status: 500 });
  }
});
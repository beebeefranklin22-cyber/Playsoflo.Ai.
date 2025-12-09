import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

/**
 * STRIPE CONNECT - CREATE ACCOUNT LINK
 * 
 * This function generates an Account Link URL for onboarding a connected account.
 * Account Links are temporary URLs (expire in ~5 minutes) that redirect users
 * to a Stripe-hosted onboarding flow.
 * 
 * After completing onboarding, users are redirected back to your success_url.
 * If they exit early, they're sent to your refresh_url.
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
    // STEP 3: GET CONNECTED ACCOUNT ID
    // ============================================
    // The account ID should be stored on the user profile
    const { account_id } = await req.json();
    
    if (!account_id) {
      return Response.json({ 
        error: 'Missing account_id. User must create a connected account first.' 
      }, { status: 400 });
    }

    // ============================================
    // STEP 4: DETERMINE REDIRECT URLS
    // ============================================
    // Get the origin from the request to build proper redirect URLs
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    
    // Where to send user after successful onboarding
    const successUrl = `${origin}/stripe-onboarding-complete`;
    
    // Where to send user if they exit the flow early or need to retry
    const refreshUrl = `${origin}/stripe-onboarding-refresh`;

    // ============================================
    // STEP 5: CREATE ACCOUNT LINK
    // ============================================
    // Generate the onboarding URL
    const accountLink = await stripe.accountLinks.create({
      account: account_id, // The connected account to onboard
      
      // Redirect URLs
      refresh_url: refreshUrl,
      return_url: successUrl,
      
      // Type of link - 'account_onboarding' for new accounts
      type: 'account_onboarding',
      
      // Collection options - what information to collect
      collect: 'eventually_due', // Collect all required info for payouts
    });

    // ============================================
    // STEP 6: RETURN ACCOUNT LINK URL
    // ============================================
    return Response.json({ 
      url: accountLink.url,
      expires_at: accountLink.expires_at,
      message: 'Redirect user to this URL to complete onboarding',
      note: 'This URL expires in ~5 minutes. Generate a new one if needed.'
    });

  } catch (error) {
    console.error('Account link creation error:', error);
    return Response.json({ 
      error: error.message,
      hint: 'Verify the account_id exists and belongs to your platform'
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

/**
 * STRIPE CONNECT - CREATE CONNECTED ACCOUNT
 * 
 * This function creates a new Stripe Connected Account for a provider/seller
 * using the Controller model where the platform is responsible for:
 * - Pricing and fee collection
 * - Losses, refunds, and chargebacks
 * - Providing Express Dashboard access to connected accounts
 * 
 * API Version: 2025-11-17.clover
 */

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: AUTHENTICATE USER
    // ============================================
    // Initialize Base44 SDK and verify user is logged in
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    // ============================================
    // STEP 2: INITIALIZE STRIPE SDK
    // ============================================
    // TODO: Add your Stripe Secret Key to environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      return Response.json({ 
        error: 'STRIPE_SECRET_KEY not configured. Please add it to environment variables.' 
      }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover', // Latest API version
    });

    // ============================================
    // STEP 3: PARSE REQUEST DATA
    // ============================================
    const { country, email, business_type } = await req.json();

    // ============================================
    // STEP 4: CREATE CONNECTED ACCOUNT
    // ============================================
    // Using controller model (NOT top-level type property)
    // This gives the platform full control over pricing, fees, and risk
    const account = await stripe.accounts.create({
      // Required: specify country for the connected account
      country: country || 'US',
      
      // Optional: pre-fill email for easier onboarding
      email: email || user.email,
      
      // Optional: business type (individual or company)
      business_type: business_type || 'individual',

      // CONTROLLER CONFIGURATION
      // This is what makes it a managed account
      controller: {
        // Platform collects application fees
        fees: {
          payer: 'application' // Platform is responsible for fee collection
        },
        
        // Platform is liable for losses (refunds, chargebacks, fraud)
        losses: {
          payments: 'application' // Platform bears the risk
        },
        
        // Give connected accounts access to Stripe Express Dashboard
        // They can view their earnings, payouts, and edit business info
        stripe_dashboard: {
          type: 'express' // Express dashboard for simplified account management
        }
      },

      // Capabilities the account needs to accept payments
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },

      // Store user email in metadata for reference
      metadata: {
        platform_user_id: user.id,
        platform_user_email: user.email,
        created_at: new Date().toISOString(),
      }
    });

    // ============================================
    // STEP 5: SAVE ACCOUNT ID TO USER PROFILE
    // ============================================
    // Store the Stripe Account ID so we can reference it later
    await base44.auth.updateMe({
      stripe_account_id: account.id
    });

    // ============================================
    // STEP 6: RETURN SUCCESS RESPONSE
    // ============================================
    return Response.json({ 
      account_id: account.id,
      status: 'created',
      message: 'Connected account created successfully. Please complete onboarding.',
      charges_enabled: account.charges_enabled, // Can accept payments?
      details_submitted: account.details_submitted, // Onboarding complete?
    });

  } catch (error) {
    console.error('Connected account creation error:', error);
    return Response.json({ 
      error: error.message,
      hint: 'Check that STRIPE_SECRET_KEY is valid and not expired'
    }, { status: 500 });
  }
});
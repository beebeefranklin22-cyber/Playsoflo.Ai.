/**
 * Create a Stripe Connected Account
 * 
 * This function creates a connected account where:
 * - Platform controls pricing and fees
 * - Platform handles losses/refunds/chargebacks
 * - Account holder gets access to Express dashboard
 * 
 * Flow:
 * 1. Validate user authentication
 * 2. Initialize Stripe with secret key
 * 3. Create connected account with controller properties
 * 4. Return account ID for onboarding
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: AUTHENTICATE USER
    // ============================================
    // Create base44 client from incoming request
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ============================================
    // STEP 2: VALIDATE STRIPE CREDENTIALS
    // ============================================
    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    // ERROR HANDLING: Check if Stripe key is configured
    if (!stripeSecretKey) {
      return Response.json({ 
        error: 'Stripe API key not configured. Please add STRIPE_SECRET_KEY to your environment variables in the dashboard settings.',
        setup_url: 'https://dashboard.stripe.com/apikeys'
      }, { status: 500 });
    }

    // Initialize Stripe with latest API version
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover',
    });

    // ============================================
    // STEP 3: PARSE REQUEST BODY
    // ============================================
    const { email, country = 'US' } = await req.json();
    
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // ============================================
    // STEP 4: CREATE CONNECTED ACCOUNT
    // ============================================
    /**
     * IMPORTANT: Using controller properties (NOT top-level type)
     * 
     * Controller configuration:
     * - fees.payer: 'application' = Platform controls pricing and fees
     * - losses.payments: 'application' = Platform handles refunds/chargebacks
     * - stripe_dashboard.type: 'express' = Give account holder Express dashboard access
     */
    const account = await stripe.accounts.create({
      // Email for the connected account holder
      email: email,
      
      // Country of operation (affects payment methods and regulations)
      country: country,
      
      // Controller configuration (CRITICAL: Do not use top-level 'type' property)
      controller: {
        // Platform is responsible for pricing and fee collection
        fees: {
          payer: 'application'
        },
        
        // Platform is responsible for losses, refunds, and chargebacks
        losses: {
          payments: 'application'
        },
        
        // Give them access to the Express dashboard for account management
        stripe_dashboard: {
          type: 'express'
        }
      },
      
      // Capabilities the account needs (payment processing)
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // ============================================
    // STEP 5: RETURN ACCOUNT DETAILS
    // ============================================
    return Response.json({
      success: true,
      account_id: account.id,
      email: account.email,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      message: 'Connected account created successfully. Use this account_id for onboarding.'
    });

  } catch (error) {
    // ============================================
    // ERROR HANDLING
    // ============================================
    console.error('Create connected account error:', error);
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeAuthenticationError') {
      return Response.json({ 
        error: 'Invalid Stripe API key. Please check your STRIPE_SECRET_KEY in environment variables.',
        details: error.message 
      }, { status: 401 });
    }
    
    return Response.json({ 
      error: 'Failed to create connected account',
      details: error.message 
    }, { status: 500 });
  }
});
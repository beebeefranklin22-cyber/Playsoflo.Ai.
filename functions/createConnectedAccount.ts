import Stripe from 'npm:stripe@17.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: Initialize Base44 SDK and Authenticate User
    // ============================================
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ============================================
    // STEP 2: Initialize Stripe with Secret Key
    // ============================================
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ 
        error: 'STRIPE_SECRET_KEY not configured',
        hint: 'Please set STRIPE_SECRET_KEY in your environment variables'
      }, { status: 500 });
    }

    // Initialize Stripe with the latest API version
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover'
    });

    // ============================================
    // STEP 3: Parse Request Body
    // ============================================
    const { email, businessName, country = 'US' } = await req.json();

    if (!email || !businessName) {
      return Response.json({ 
        error: 'Missing required fields: email and businessName' 
      }, { status: 400 });
    }

    // ============================================
    // STEP 4: Create Connected Account
    // ============================================
    // IMPORTANT: Use controller properties, NOT top-level type
    // The controller object specifies who is responsible for what
    const account = await stripe.accounts.create({
      // Email for the connected account
      email: email,
      
      // Controller configuration - defines responsibilities
      controller: {
        // Platform is responsible for pricing and fee collection
        fees: {
          payer: 'application' // Platform controls fees
        },
        // Platform is responsible for losses (refunds/chargebacks)
        losses: {
          payments: 'application' // Platform handles disputes
        },
        // Give connected account access to Express dashboard
        stripe_dashboard: {
          type: 'express' // Express dashboard for easy management
        }
      },
      
      // Capabilities the account needs
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      
      // Country where the account operates
      country: country,
      
      // Store metadata for your app
      metadata: {
        app_user_email: user.email,
        business_name: businessName,
        created_at: new Date().toISOString()
      }
    });

    // ============================================
    // STEP 5: Store Account ID in User Record
    // ============================================
    // Save the Stripe account ID to the user so we can reference it later
    await base44.auth.updateMe({
      stripe_connect_account_id: account.id
    });

    // ============================================
    // STEP 6: Return Success Response
    // ============================================
    return Response.json({
      success: true,
      accountId: account.id,
      message: 'Connected account created successfully',
      // Include useful account info
      details: {
        email: account.email,
        country: account.country,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted
      }
    });

  } catch (error) {
    console.error('Error creating connected account:', error);
    return Response.json({ 
      error: error.message || 'Failed to create connected account',
      type: error.type || 'unknown_error'
    }, { status: 500 });
  }
});
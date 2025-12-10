/**
 * Create Stripe Connect Checkout Session
 * 
 * Creates a checkout session using Destination Charges with application fee.
 * This allows the platform to take a commission on each sale.
 * 
 * Flow:
 * 1. Authenticate user (optional for guests)
 * 2. Fetch product details from Stripe
 * 3. Calculate application fee (platform commission)
 * 4. Create checkout session with destination charge
 * 5. Return checkout URL
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: VALIDATE STRIPE CREDENTIALS
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
    // STEP 2: PARSE REQUEST BODY
    // ============================================
    const { 
      product_id,
      quantity = 1,
      success_url,
      cancel_url
    } = await req.json();
    
    if (!product_id) {
      return Response.json({ error: 'product_id is required' }, { status: 400 });
    }

    // ============================================
    // STEP 3: FETCH PRODUCT DETAILS
    // ============================================
    /**
     * Get product from Stripe to access:
     * - Price information
     * - Connected account ID from metadata
     */
    const product = await stripe.products.retrieve(product_id, {
      expand: ['default_price']
    });

    // Extract connected account ID from metadata
    const connectedAccountId = product.metadata?.connected_account_id;
    
    if (!connectedAccountId) {
      return Response.json({ 
        error: 'Product does not have a connected account configured' 
      }, { status: 400 });
    }

    // Get price details
    const defaultPrice = product.default_price;
    const priceId = typeof defaultPrice === 'object' ? defaultPrice.id : defaultPrice;
    const priceAmount = typeof defaultPrice === 'object' ? defaultPrice.unit_amount : 0;

    // ============================================
    // STEP 4: CALCULATE APPLICATION FEE
    // ============================================
    /**
     * Application Fee = Platform Commission
     * 
     * Example: 10% platform fee on $20 product
     * - Product price: 2000 cents ($20.00)
     * - Application fee: 200 cents ($2.00)
     * - Seller receives: 1800 cents ($18.00)
     * 
     * Adjust the percentage based on your business model
     */
    const PLATFORM_FEE_PERCENTAGE = 0.10; // 10% platform fee
    const applicationFeeAmount = Math.round(priceAmount * PLATFORM_FEE_PERCENTAGE * quantity);

    // ============================================
    // STEP 5: CREATE CHECKOUT SESSION
    // ============================================
    /**
     * DESTINATION CHARGE CONFIGURATION
     * 
     * Key components:
     * - line_items: Products being purchased
     * - payment_intent_data.application_fee_amount: Platform's commission
     * - payment_intent_data.transfer_data.destination: Connected account receiving funds
     * - mode: 'payment' for one-time charges
     */
    const origin = new URL(req.url).origin;
    const checkoutSession = await stripe.checkout.sessions.create({
      // ============================================
      // LINE ITEMS (Products to purchase)
      // ============================================
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],

      // ============================================
      // PAYMENT INTENT DATA (Destination Charge)
      // ============================================
      payment_intent_data: {
        // Platform's commission (in cents)
        application_fee_amount: applicationFeeAmount,
        
        // Route funds to connected account
        transfer_data: {
          destination: connectedAccountId,
        },
        
        // Optional: Add metadata for tracking
        metadata: {
          product_name: product.name,
          seller_account: connectedAccountId,
          platform_fee_percentage: PLATFORM_FEE_PERCENTAGE,
        },
      },

      // ============================================
      // CHECKOUT CONFIGURATION
      // ============================================
      mode: 'payment', // One-time payment (use 'subscription' for recurring)
      
      // Success URL (user redirected after payment)
      success_url: success_url || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      
      // Cancel URL (user redirected if they cancel)
      cancel_url: cancel_url || `${origin}/stripe-connect-storefront`,
      
      // Optional: Collect customer email
      customer_email: undefined, // Add if you want to collect email
    });

    // ============================================
    // STEP 6: RETURN CHECKOUT URL
    // ============================================
    return Response.json({
      success: true,
      checkout_url: checkoutSession.url,
      session_id: checkoutSession.id,
      product_name: product.name,
      total_amount: priceAmount * quantity,
      platform_fee: applicationFeeAmount,
      seller_receives: (priceAmount * quantity) - applicationFeeAmount,
      message: 'Redirect user to checkout_url to complete purchase'
    });

  } catch (error) {
    console.error('Create checkout error:', error);
    
    // Handle specific errors
    if (error.code === 'resource_missing') {
      return Response.json({ 
        error: 'Product or connected account not found' 
      }, { status: 404 });
    }
    
    return Response.json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    }, { status: 500 });
  }
});
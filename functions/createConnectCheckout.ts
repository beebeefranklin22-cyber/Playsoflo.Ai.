import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

/**
 * STRIPE CONNECT - CREATE CHECKOUT WITH DESTINATION CHARGE
 * 
 * This function creates a Stripe Checkout session that uses a DESTINATION CHARGE.
 * 
 * How it works:
 * 1. Customer pays $100 for a product
 * 2. Platform takes $10 as application fee (commission)
 * 3. Connected account receives $90 automatically
 * 
 * The transfer happens automatically - no manual transfer needed.
 * 
 * API Version: 2025-11-17.clover
 */

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: AUTHENTICATE USER (CUSTOMER)
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
    // STEP 3: PARSE CHECKOUT REQUEST
    // ============================================
    const { 
      product_id,             // Stripe Product ID
      quantity,               // Number of items (default: 1)
      connected_account_id,   // Destination account for the funds
      application_fee_amount, // Platform commission in cents (e.g., 1000 = $10)
      success_url,            // Where to redirect after success
      cancel_url,             // Where to redirect if canceled
    } = await req.json();

    // Validate required fields
    if (!product_id || !connected_account_id) {
      return Response.json({ 
        error: 'Missing required fields: product_id and connected_account_id' 
      }, { status: 400 });
    }

    // ============================================
    // STEP 4: RETRIEVE PRODUCT DETAILS
    // ============================================
    // Get the product to access its default price
    const product = await stripe.products.retrieve(product_id);
    
    if (!product.default_price) {
      return Response.json({ 
        error: 'Product does not have a default price' 
      }, { status: 400 });
    }

    // ============================================
    // STEP 5: CALCULATE APPLICATION FEE
    // ============================================
    // If no fee is specified, use a default (e.g., 10% platform commission)
    let platformFee = application_fee_amount;
    
    if (!platformFee) {
      // Get price details to calculate 10% fee
      const price = await stripe.prices.retrieve(product.default_price);
      const totalAmount = price.unit_amount * (quantity || 1);
      platformFee = Math.round(totalAmount * 0.10); // 10% default commission
    }

    // ============================================
    // STEP 6: DETERMINE REDIRECT URLS
    // ============================================
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const successRedirect = success_url || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelRedirect = cancel_url || `${origin}/payment-cancelled`;

    // ============================================
    // STEP 7: CREATE CHECKOUT SESSION
    // ============================================
    // This creates a hosted checkout page with destination charge
    const session = await stripe.checkout.sessions.create({
      // Payment mode - one-time payment
      mode: 'payment',
      
      // Accepted payment methods
      payment_method_types: ['card'],
      
      // Line items (products being purchased)
      line_items: [{
        price: product.default_price, // Use the default price ID
        quantity: quantity || 1,
      }],
      
      // DESTINATION CHARGE CONFIGURATION
      // This is where the magic happens!
      payment_intent_data: {
        // Platform commission (in cents)
        application_fee_amount: platformFee,
        
        // Where to send the remaining funds
        transfer_data: {
          destination: connected_account_id, // Connected account receives funds minus fee
        },
        
        // Store useful info in metadata
        metadata: {
          customer_email: user.email,
          customer_name: user.full_name || user.email,
          product_id: product_id,
          platform_fee: platformFee,
        },
      },
      
      // Pre-fill customer email
      customer_email: user.email,
      
      // Store session metadata
      metadata: {
        customer_id: user.id,
        customer_email: user.email,
        product_id: product_id,
        connected_account_id: connected_account_id,
      },
      
      // Redirect URLs
      success_url: successRedirect,
      cancel_url: cancelRedirect,
    });

    // ============================================
    // STEP 8: RETURN CHECKOUT SESSION
    // ============================================
    return Response.json({ 
      session_id: session.id,
      url: session.url,
      
      // Payment details
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
      },
      
      // Financial breakdown
      total_amount: session.amount_total,
      application_fee: platformFee,
      seller_receives: session.amount_total - platformFee,
      currency: session.currency,
      
      message: 'Redirect customer to session.url to complete payment',
      note: 'After payment, funds are automatically split between platform and seller'
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    return Response.json({ 
      error: error.message,
      hint: 'Verify product_id, connected_account_id, and that the connected account is onboarded'
    }, { status: 500 });
  }
});
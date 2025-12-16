import Stripe from 'npm:stripe@17.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: Authenticate User (Optional)
    // ============================================
    const base44 = createClientFromRequest(req);
    // For a public storefront, authentication might be optional
    // We'll allow unauthenticated purchases in this example
    
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
    // STEP 3: Parse Request Data
    // ============================================
    const { productId, quantity = 1 } = await req.json();

    if (!productId) {
      return Response.json({ 
        error: 'Missing required field: productId' 
      }, { status: 400 });
    }

    // ============================================
    // STEP 4: Get Product Details
    // ============================================
    // Retrieve the product to get pricing and connected account info
    const product = await stripe.products.retrieve(productId, {
      expand: ['default_price']
    });

    // Get the connected account ID from product metadata
    const connectedAccountId = product.metadata?.connected_account_id;
    
    if (!connectedAccountId) {
      return Response.json({ 
        error: 'Product is not associated with a seller',
        hint: 'Product metadata must include connected_account_id'
      }, { status: 400 });
    }

    const price = product.default_price;
    if (!price || !price.unit_amount) {
      return Response.json({ 
        error: 'Product does not have a valid price' 
      }, { status: 400 });
    }

    // ============================================
    // STEP 5: Calculate Application Fee
    // ============================================
    // This is YOUR platform fee (how you make money)
    // Example: 10% of the transaction + $0.50
    const subtotal = price.unit_amount * quantity; // in cents
    const platformFeePercentage = 0.10; // 10%
    const platformFeeFixed = 50; // 50 cents
    
    const applicationFeeAmount = Math.round(
      (subtotal * platformFeePercentage) + platformFeeFixed
    );

    // Ensure seller gets at least something
    if (applicationFeeAmount >= subtotal) {
      return Response.json({ 
        error: 'Application fee cannot exceed total amount' 
      }, { status: 400 });
    }

    // ============================================
    // STEP 6: Get App URL for Redirects
    // ============================================
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:3000';
    const successUrl = `${appBaseUrl}/StripeConnectStorefront?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appBaseUrl}/StripeConnectStorefront?canceled=true`;

    // ============================================
    // STEP 7: Create Checkout Session with Destination Charge
    // ============================================
    // DESTINATION CHARGE: Payment goes to platform, then transferred to seller
    // This gives you control over refunds and disputes
    const session = await stripe.checkout.sessions.create({
      // Line items for the checkout
      line_items: [
        {
          price_data: {
            currency: price.currency,
            unit_amount: price.unit_amount,
            product_data: {
              name: product.name,
              description: product.description,
              images: product.images
            }
          },
          quantity: quantity
        }
      ],
      
      // CRITICAL: Payment Intent Data for Destination Charges
      payment_intent_data: {
        // Your platform fee (how you monetize)
        application_fee_amount: applicationFeeAmount,
        
        // Transfer remaining funds to connected account
        transfer_data: {
          destination: connectedAccountId
        },
        
        // Store metadata for tracking
        metadata: {
          product_id: productId,
          connected_account_id: connectedAccountId,
          seller_email: product.metadata?.seller_email
        }
      },
      
      // Payment mode (not subscription)
      mode: 'payment',
      
      // Redirect URLs
      success_url: successUrl,
      cancel_url: cancelUrl,
      
      // Store session metadata
      metadata: {
        product_id: productId,
        product_name: product.name,
        seller_account: connectedAccountId
      }
    });

    // ============================================
    // STEP 8: Return Checkout URL
    // ============================================
    return Response.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      
      // Include fee breakdown for transparency
      breakdown: {
        subtotal: subtotal,
        applicationFee: applicationFeeAmount,
        sellerReceives: subtotal - applicationFeeAmount,
        formatted: {
          subtotal: `$${(subtotal / 100).toFixed(2)}`,
          applicationFee: `$${(applicationFeeAmount / 100).toFixed(2)}`,
          sellerReceives: `$${((subtotal - applicationFeeAmount) / 100).toFixed(2)}`
        }
      }
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return Response.json({ 
      error: error.message || 'Failed to create checkout session',
      type: error.type || 'unknown_error'
    }, { status: 500 });
  }
});
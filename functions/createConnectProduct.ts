/**
 * Create Stripe Connect Product
 * 
 * Creates a product at the PLATFORM LEVEL (not on connected account).
 * Stores the connected_account_id in product metadata for destination charges.
 * 
 * Flow:
 * 1. Authenticate user
 * 2. Create product with price at platform level
 * 3. Store connected account mapping in metadata
 * 4. Return product details
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
        error: 'Stripe API key not configured'
      }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-11-17.clover',
    });

    // ============================================
    // STEP 3: PARSE REQUEST BODY
    // ============================================
    const { 
      name, 
      description, 
      price, // Price in cents (e.g., 2000 = $20.00)
      currency = 'usd',
      connected_account_id, // Which connected account should receive funds
      image_url 
    } = await req.json();
    
    // Validate required fields
    if (!name || !price || !connected_account_id) {
      return Response.json({ 
        error: 'Missing required fields: name, price, and connected_account_id are required' 
      }, { status: 400 });
    }

    // Validate price is a positive integer
    if (typeof price !== 'number' || price <= 0 || !Number.isInteger(price)) {
      return Response.json({ 
        error: 'Price must be a positive integer in cents (e.g., 2000 for $20.00)' 
      }, { status: 400 });
    }

    // ============================================
    // STEP 4: CREATE PRODUCT AT PLATFORM LEVEL
    // ============================================
    /**
     * IMPORTANT: Product is created at PLATFORM LEVEL, not on connected account
     * 
     * Why?
     * - Platform controls pricing
     * - Can sell products from multiple connected accounts in one storefront
     * - Easier to manage application fees
     * 
     * Metadata stores the connected_account_id for routing payments
     */
    const product = await stripe.products.create({
      // Product details
      name: name,
      description: description,
      
      // Optional product image
      images: image_url ? [image_url] : undefined,
      
      // Create default price (saves having to create price separately)
      default_price_data: {
        unit_amount: price, // Price in cents
        currency: currency, // Currency code (usd, eur, etc.)
      },
      
      // CRITICAL: Store connected account ID in metadata
      // This tells us where to send funds during checkout
      metadata: {
        connected_account_id: connected_account_id,
        created_by_email: user.email,
        created_at: new Date().toISOString(),
      },
    });

    // ============================================
    // STEP 5: RETURN PRODUCT DETAILS
    // ============================================
    return Response.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price_id: product.default_price,
        price_amount: price,
        currency: currency,
        connected_account_id: connected_account_id,
        image_url: product.images?.[0],
      },
      message: 'Product created successfully at platform level'
    });

  } catch (error) {
    console.error('Create product error:', error);
    
    // Handle invalid connected account
    if (error.code === 'resource_missing') {
      return Response.json({ 
        error: 'Invalid connected_account_id. Please create and onboard the account first.' 
      }, { status: 400 });
    }
    
    return Response.json({ 
      error: 'Failed to create product',
      details: error.message 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

/**
 * STRIPE CONNECT - CREATE PLATFORM PRODUCT
 * 
 * This function creates a product at the PLATFORM level (not on the connected account).
 * The platform owns the product, but we store which connected account it belongs to
 * in the product's metadata.
 * 
 * When customers purchase this product, we'll use destination charges to:
 * 1. Charge the customer
 * 2. Take an application fee (platform commission)
 * 3. Transfer the rest to the connected account
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
    // STEP 2: VERIFY USER HAS CONNECTED ACCOUNT
    // ============================================
    const connectedAccountId = user.stripe_account_id;
    
    if (!connectedAccountId) {
      return Response.json({ 
        error: 'No connected account found',
        action: 'Please create and onboard a connected account first'
      }, { status: 400 });
    }

    // ============================================
    // STEP 3: INITIALIZE STRIPE
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
    // STEP 4: PARSE PRODUCT DETAILS
    // ============================================
    const { 
      name,           // Product name (e.g., "Premium Service")
      description,    // Product description
      price,          // Price in dollars (e.g., 29.99)
      currency,       // Currency code (e.g., "usd")
      images,         // Array of image URLs
      metadata        // Additional custom data
    } = await req.json();

    // Validate required fields
    if (!name || price === undefined) {
      return Response.json({ 
        error: 'Missing required fields: name and price' 
      }, { status: 400 });
    }

    // Convert dollars to cents for Stripe
    const priceInCents = Math.round(price * 100);
    
    // Use USD as default currency
    const productCurrency = currency || 'usd';

    // ============================================
    // STEP 5: CREATE PRODUCT AT PLATFORM LEVEL
    // ============================================
    // Product is created on the platform account, not the connected account
    // We store the connected account ID in metadata for reference
    const product = await stripe.products.create({
      name: name,
      description: description || '',
      
      // Optional: add images for the product
      images: images || [],
      
      // Create a default price with the product
      default_price_data: {
        currency: productCurrency,
        unit_amount: priceInCents, // Price in cents
      },
      
      // Store connected account info in metadata
      // This links the product to the seller
      metadata: {
        connected_account_id: connectedAccountId,
        seller_email: user.email,
        seller_name: user.full_name || user.email,
        created_at: new Date().toISOString(),
        // Include any custom metadata passed in
        ...metadata,
      }
    });

    // ============================================
    // STEP 6: OPTIONALLY SAVE TO DATABASE
    // ============================================
    // You can also store products in your database for faster queries
    // Example: await base44.entities.Product.create({ ... })

    // ============================================
    // STEP 7: RETURN SUCCESS RESPONSE
    // ============================================
    return Response.json({ 
      product_id: product.id,
      name: product.name,
      description: product.description,
      price: price,
      price_in_cents: priceInCents,
      currency: productCurrency,
      default_price_id: product.default_price,
      connected_account_id: connectedAccountId,
      images: product.images,
      message: 'Product created successfully at platform level',
      note: 'When customers buy this, use destination charges to transfer funds to the connected account'
    });

  } catch (error) {
    console.error('Product creation error:', error);
    return Response.json({ 
      error: error.message,
      hint: 'Check that STRIPE_SECRET_KEY is valid and price is a positive number'
    }, { status: 500 });
  }
});
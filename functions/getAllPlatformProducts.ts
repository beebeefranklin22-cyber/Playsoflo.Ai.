import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

/**
 * STRIPE CONNECT - GET ALL PLATFORM PRODUCTS
 * 
 * This function retrieves all products created at the platform level.
 * It includes the connected account ID from metadata so you can display
 * products from all sellers in a marketplace storefront.
 * 
 * API Version: 2025-11-17.clover
 */

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: AUTHENTICATE USER (OPTIONAL)
    // ============================================
    // For a public storefront, you might not require auth
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

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
    // STEP 3: PARSE QUERY PARAMETERS
    // ============================================
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit')) || 100;
    const connectedAccountId = url.searchParams.get('connected_account_id');

    // ============================================
    // STEP 4: RETRIEVE PRODUCTS FROM STRIPE
    // ============================================
    // Get all active products from the platform account
    const products = await stripe.products.list({
      active: true,
      limit: limit,
      expand: ['data.default_price'], // Include price details
    });

    // ============================================
    // STEP 5: FILTER AND FORMAT PRODUCTS
    // ============================================
    // Filter by connected account if specified
    let filteredProducts = products.data;
    
    if (connectedAccountId) {
      filteredProducts = products.data.filter(
        product => product.metadata?.connected_account_id === connectedAccountId
      );
    }

    // Format products for easier frontend consumption
    const formattedProducts = filteredProducts.map(product => {
      // Extract price information
      const defaultPrice = product.default_price;
      const priceAmount = defaultPrice?.unit_amount || 0;
      const priceCurrency = defaultPrice?.currency || 'usd';
      
      return {
        // Product basics
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
        
        // Pricing
        price_id: defaultPrice?.id,
        price_amount_cents: priceAmount,
        price_amount_dollars: priceAmount / 100,
        currency: priceCurrency,
        
        // Seller information (from metadata)
        connected_account_id: product.metadata?.connected_account_id,
        seller_email: product.metadata?.seller_email,
        seller_name: product.metadata?.seller_name,
        
        // Additional metadata
        metadata: product.metadata,
        
        // Timestamps
        created: product.created,
      };
    });

    // ============================================
    // STEP 6: RETURN PRODUCTS
    // ============================================
    return Response.json({ 
      products: formattedProducts,
      total_count: formattedProducts.length,
      has_more: products.has_more,
      message: 'Products retrieved successfully',
    });

  } catch (error) {
    console.error('Product retrieval error:', error);
    return Response.json({ 
      error: error.message,
      hint: 'Check that STRIPE_SECRET_KEY is valid'
    }, { status: 500 });
  }
});
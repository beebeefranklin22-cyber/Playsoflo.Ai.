/**
 * Get All Connect Products
 * 
 * Retrieves all products from Stripe with their connected account mappings.
 * Used to display products in the storefront.
 * 
 * Flow:
 * 1. Authenticate user (optional for public storefront)
 * 2. Fetch all products from Stripe
 * 3. Fetch prices for each product
 * 4. Return formatted product list
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
    // STEP 2: FETCH ALL PRODUCTS
    // ============================================
    /**
     * List all products from the platform
     * 
     * Products are stored at platform level with metadata containing
     * the connected_account_id for payment routing
     */
    const products = await stripe.products.list({
      active: true, // Only get active products
      limit: 100,   // Adjust based on your needs
      expand: ['data.default_price'], // Include price details
    });

    // ============================================
    // STEP 3: FORMAT PRODUCT DATA
    // ============================================
    const formattedProducts = products.data.map(product => {
      // Extract price information
      const defaultPrice = product.default_price;
      const priceAmount = typeof defaultPrice === 'object' ? defaultPrice.unit_amount : null;
      const currency = typeof defaultPrice === 'object' ? defaultPrice.currency : 'usd';
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        
        // Price information
        price_id: typeof defaultPrice === 'object' ? defaultPrice.id : defaultPrice,
        price_amount: priceAmount,
        currency: currency,
        price_formatted: priceAmount ? `$${(priceAmount / 100).toFixed(2)}` : 'N/A',
        
        // Connected account from metadata
        connected_account_id: product.metadata?.connected_account_id,
        seller_email: product.metadata?.created_by_email,
        
        // Product images
        image_url: product.images?.[0] || null,
        
        // Timestamps
        created: product.created,
        updated: product.updated,
      };
    });

    // ============================================
    // STEP 4: RETURN PRODUCTS
    // ============================================
    return Response.json({
      success: true,
      products: formattedProducts,
      total: formattedProducts.length,
    });

  } catch (error) {
    console.error('Get products error:', error);
    return Response.json({ 
      error: 'Failed to fetch products',
      details: error.message 
    }, { status: 500 });
  }
});
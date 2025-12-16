import Stripe from 'npm:stripe@17.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: Authenticate User (Optional for public storefront)
    // ============================================
    const base44 = createClientFromRequest(req);
    // Note: For a public storefront, you might want to allow unauthenticated access
    // For this example, we'll make it public
    
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
    // STEP 3: List All Products
    // ============================================
    // Get all products from the platform account
    const products = await stripe.products.list({
      active: true, // Only get active products
      expand: ['data.default_price'], // Include price details
      limit: 100 // Adjust based on your needs
    });

    // ============================================
    // STEP 4: Format Product Data
    // ============================================
    // Transform Stripe product data into a clean format
    const formattedProducts = products.data.map(product => {
      const price = product.default_price;
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        
        // Price information
        price: {
          id: price?.id,
          amount: price?.unit_amount, // Amount in cents
          currency: price?.currency,
          formatted: price ? `$${(price.unit_amount / 100).toFixed(2)}` : 'N/A'
        },
        
        // Connected account information (from metadata)
        seller: {
          accountId: product.metadata?.connected_account_id,
          email: product.metadata?.seller_email
        },
        
        // Product metadata
        metadata: product.metadata,
        
        // Additional info
        images: product.images || [],
        created: product.created
      };
    });

    // ============================================
    // STEP 5: Return Products
    // ============================================
    return Response.json({
      success: true,
      products: formattedProducts,
      count: formattedProducts.length
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return Response.json({ 
      error: error.message || 'Failed to fetch products',
      type: error.type || 'unknown_error'
    }, { status: 500 });
  }
});
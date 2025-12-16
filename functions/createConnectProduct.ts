import Stripe from 'npm:stripe@17.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: Authenticate User
    // ============================================
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    // STEP 3: Verify Connected Account Exists
    // ============================================
    const connectedAccountId = user.stripe_connect_account_id;
    
    if (!connectedAccountId) {
      return Response.json({ 
        error: 'No connected account found',
        hint: 'Complete Stripe Connect onboarding first'
      }, { status: 400 });
    }

    // ============================================
    // STEP 4: Parse Product Details
    // ============================================
    const { name, description, priceInCents, currency = 'usd' } = await req.json();

    if (!name || !priceInCents) {
      return Response.json({ 
        error: 'Missing required fields: name and priceInCents' 
      }, { status: 400 });
    }

    if (priceInCents < 50) {
      return Response.json({ 
        error: 'Price must be at least 50 cents (minimum Stripe charge)' 
      }, { status: 400 });
    }

    // ============================================
    // STEP 5: Create Product at Platform Level
    // ============================================
    // IMPORTANT: Create products on the PLATFORM account, not the connected account
    // This allows you to control pricing and fees
    const product = await stripe.products.create({
      name: name,
      description: description,
      
      // Create the default price inline
      default_price_data: {
        unit_amount: priceInCents, // Price in cents (e.g., 2000 = $20.00)
        currency: currency
      },
      
      // Store the connected account ID in metadata
      // This links the product to the seller who will receive funds
      metadata: {
        connected_account_id: connectedAccountId,
        seller_email: user.email,
        created_by: user.email,
        created_at: new Date().toISOString()
      }
    });

    // ============================================
    // STEP 6: Return Success Response
    // ============================================
    return Response.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        default_price: product.default_price,
        metadata: product.metadata
      },
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('Error creating product:', error);
    return Response.json({ 
      error: error.message || 'Failed to create product',
      type: error.type || 'unknown_error'
    }, { status: 500 });
  }
});
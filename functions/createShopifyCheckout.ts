import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { product_id, quantity = 1, shipping_address } = await req.json();

    if (!product_id || !shipping_address) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate shipping address
    if (!shipping_address.name || !shipping_address.line1 || !shipping_address.city || 
        !shipping_address.state || !shipping_address.postal_code || !shipping_address.country) {
      return Response.json({ error: 'Incomplete shipping address' }, { status: 400 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);

    // Fetch product from Shopify affiliate catalog
    const { data: productData } = await base44.functions.invoke('fetchShopifyProducts');
    const product = productData.products.find(p => p.id === product_id);

    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    // Calculate totals (price in cents)
    const itemPrice = Math.round(product.price * 100);
    const subtotal = itemPrice * quantity;
    const shippingCost = 500; // $5.00 shipping
    const platformFee = Math.round((subtotal + shippingCost) * 0.05); // 5% platform fee
    const total = subtotal + shippingCost + platformFee;

    // Create order record
    const order = await base44.entities.Order.create({
      user_email: user.email,
      product_id: product.id,
      product_name: product.title,
      quantity: quantity,
      item_price: product.price,
      subtotal: subtotal / 100,
      shipping_cost: shippingCost / 100,
      platform_fee: platformFee / 100,
      total_amount: total / 100,
      status: 'pending',
      shipping_address: JSON.stringify(shipping_address),
      affiliate_link: product.affiliate_link
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.title,
            description: product.description,
            images: [product.image]
          },
          unit_amount: itemPrice
        },
        quantity: quantity
      }, {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping & Handling',
            description: 'Standard shipping'
          },
          unit_amount: shippingCost
        },
        quantity: 1
      }, {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Platform Service Fee',
            description: '5% processing fee'
          },
          unit_amount: platformFee
        },
        quantity: 1
      }],
      success_url: `${req.headers.get('origin')}/OrderSuccess?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${req.headers.get('origin')}/Marketplace`,
      customer_email: user.email,
      metadata: {
        user_email: user.email,
        order_id: order.id,
        product_id: product.id,
        description: 'Shopify product purchase'
      }
    });

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      order_id: order.id
    });

  } catch (error) {
    console.error('Shopify checkout error:', error);
    return Response.json({ 
      error: 'Checkout creation failed',
      details: error.message 
    }, { status: 500 });
  }
});
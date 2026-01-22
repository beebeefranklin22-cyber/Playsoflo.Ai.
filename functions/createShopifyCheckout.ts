import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    const { product_id, quantity = 1, shipping_address } = await req.json();

    if (!product_id || !shipping_address) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get product details from the fetchShopifyProducts function
    const productsResponse = await base44.functions.invoke('fetchShopifyProducts', {});
    const product = productsResponse.data.products.find(p => p.id === product_id);

    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    // Calculate totals
    const subtotal = product.price * quantity;
    const shipping = 5.00;
    const platformFee = (subtotal + shipping) * 0.05;
    const total = subtotal + shipping + platformFee;
    const affiliateCommission = subtotal * 0.05;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.title,
              description: product.description,
              images: [product.image_url || product.image]
            },
            unit_amount: Math.round(product.price * 100)
          },
          quantity: quantity
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Shipping & Handling'
            },
            unit_amount: Math.round(shipping * 100)
          },
          quantity: 1
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Service Fee'
            },
            unit_amount: Math.round(platformFee * 100)
          },
          quantity: 1
        }
      ],
      success_url: `${req.headers.get('origin')}/OrderSuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/Marketplace?cancelled=true`,
      metadata: {
        user_email: user.email,
        product_id: product_id,
        quantity: quantity.toString(),
        affiliate_commission: affiliateCommission.toFixed(2),
        shipping_name: shipping_address.name,
        shipping_line1: shipping_address.line1,
        shipping_line2: shipping_address.line2 || '',
        shipping_city: shipping_address.city,
        shipping_state: shipping_address.state,
        shipping_postal_code: shipping_address.postal_code,
        shipping_country: shipping_address.country || 'US',
        description: 'Shopify product purchase'
      }
    });

    // Create order record
    const order = await base44.entities.Order.create({
      user_email: user.email,
      item_type: 'shopify_product',
      item_id: product_id,
      item_name: product.title,
      quantity: quantity,
      price_per_item: product.price,
      total_amount: total,
      status: 'pending',
      stripe_session_id: session.id,
      shipping_address: shipping_address,
      tracking_url: product.affiliate_link
    });

    return Response.json({ 
      success: true,
      checkout_url: session.url,
      order_id: order.id,
      session_id: session.id
    });

  } catch (error) {
    console.error('Shopify checkout error:', error);
    return Response.json({ 
      error: error.message || 'Failed to create checkout session' 
    }, { status: 500 });
  }
});
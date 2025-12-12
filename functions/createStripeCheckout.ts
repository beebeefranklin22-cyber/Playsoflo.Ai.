import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.4.0';

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

    const stripe = new Stripe(stripeSecretKey);
    const { amount, currency = 'usd', description, payment_method_id } = await req.json();

    // Get or create Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.search({
      query: `email:'${user.email}'`,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { user_id: user.id }
      });
    }

    // Get origin from request headers
    const origin = req.headers.get('origin') || 'https://playsoflo.vercel.app';
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card', 'us_bank_account', 'cashapp'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: description || 'Payment',
              description: 'PlaySoFlo Payment',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/wallet?payment=success`,
      cancel_url: `${origin}/wallet?payment=cancelled`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        description: description,
      },
    });

    return Response.json({ 
      success: true,
      session_id: session.id,
      checkout_url: session.url
    });
  } catch (error) {
    console.error('Checkout creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
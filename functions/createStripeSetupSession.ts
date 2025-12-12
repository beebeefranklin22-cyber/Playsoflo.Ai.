import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success_url, cancel_url } = await req.json();

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    // Find or create Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name || user.email,
        metadata: {
          user_id: user.id,
          user_email: user.email
        }
      });
    }

    // Create Setup Session (for saving payment methods without charging)
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'setup',
      payment_method_types: ['card', 'us_bank_account'],
      success_url: success_url || `${req.headers.get('origin')}/wallet?payment=success&action=add_card`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/wallet?payment=cancelled`,
      metadata: {
        user_email: user.email,
        user_id: user.id
      }
    });

    return Response.json({
      success: true,
      session_id: session.id,
      setup_url: session.url
    });

  } catch (error) {
    console.error('Stripe setup session error:', error);
    return Response.json({ 
      error: error.message || 'Failed to create setup session'
    }, { status: 500 });
  }
});
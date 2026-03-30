import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success_url, cancel_url } = await req.json();

    // Create or get Stripe customer
    let customerId = user.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: {
          user_id: user.id,
          user_email: user.email
        }
      });
      customerId = customer.id;
      
      // Save customer ID to user
      await base44.auth.updateMe({ stripe_customer_id: customerId });
    }

    // Create Stripe Setup Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup',
      payment_method_types: ['card', 'us_bank_account'],
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: {
        user_email: user.email,
        user_id: user.id
      }
    });

    return Response.json({
      setup_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Setup session error:', error);
    return Response.json({ 
      error: error.message || 'Failed to create setup session' 
    }, { status: 500 });
  }
});
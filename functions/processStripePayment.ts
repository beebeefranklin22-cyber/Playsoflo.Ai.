import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.3.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, currency = 'usd', description, metadata, payment_method } = await req.json();

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY not found in environment');
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-11-20.acacia',
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description: description || 'PlaySoFlo Payment',
      metadata: {
        user_email: user.email,
        user_id: user.id,
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create payment record in database
    await base44.asServiceRole.entities.StripePayment.create({
      stripe_payment_intent_id: paymentIntent.id,
      amount: amount,
      currency,
      status: 'pending',
      user_email: user.email,
      reference_type: metadata?.reference_type || 'other',
      reference_id: metadata?.reference_id || '',
      description,
      metadata
    });

    return Response.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    });

  } catch (error) {
    console.error('Stripe payment error:', error);
    console.error('Error details:', error.stack);
    return Response.json({ 
      error: error.message || 'Failed to process payment',
      details: error.stack
    }, { status: 500 });
  }
});
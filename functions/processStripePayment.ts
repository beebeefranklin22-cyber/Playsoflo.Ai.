import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.3.1';

Deno.serve(async (req) => {
  console.log('🔵 processStripePayment called');
  
  try {
    const base44 = createClientFromRequest(req);
    
    let user;
    try {
      user = await base44.auth.me();
      console.log('✅ User authenticated:', user.email);
      
      if (!user) {
        console.error('❌ No user object returned');
        return Response.json({ error: 'Not authenticated. Please refresh and try again.' }, { status: 401 });
      }
    } catch (authError) {
      console.error('❌ Auth failed:', authError.message);
      return Response.json({ error: 'Authentication error. Please refresh and try again.' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
      console.log('📦 Request body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { amount, currency = 'usd', description, metadata } = body;

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    // Calculate platform fee: 1% with $1 minimum
    const platformFee = Math.max(1, amount * 0.01);
    const totalAmount = amount + platformFee;
    console.log('💰 Amount breakdown:', { amount, platformFee, totalAmount });

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripePublishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
    
    if (!stripeSecretKey) {
      console.error('❌ STRIPE_SECRET_KEY not found');
      return Response.json({ error: 'Stripe configuration error - missing secret key' }, { status: 500 });
    }

    if (!stripePublishableKey) {
      console.error('❌ STRIPE_PUBLISHABLE_KEY not found');
      return Response.json({ error: 'Stripe configuration error - missing publishable key' }, { status: 500 });
    }

    console.log('🔑 Stripe keys found, initializing...');
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    // Create payment intent
    console.log('💳 Creating payment intent...');
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100),
        currency,
        description: description || 'PlaySoFlo Payment',
        metadata: {
          user_email: user.email,
          user_id: user.id,
          base_amount: amount.toString(),
          platform_fee: platformFee.toString(),
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });
      console.log('✅ Payment intent created:', paymentIntent.id);
    } catch (stripeError) {
      console.error('❌ Stripe API error:', stripeError.message);
      return Response.json({ 
        error: `Stripe error: ${stripeError.message}` 
      }, { status: 500 });
    }

    // Create payment record
    console.log('💾 Creating payment record...');
    try {
      await base44.asServiceRole.entities.StripePayment.create({
        stripe_payment_intent_id: paymentIntent.id,
        amount: totalAmount,
        currency,
        status: 'pending',
        user_email: user.email,
        reference_type: metadata?.reference_type || 'other',
        reference_id: metadata?.reference_id || '',
        description,
        metadata: {
          ...metadata,
          base_amount: amount,
          platform_fee: platformFee,
          total_charged: totalAmount
        }
      });
      console.log('✅ Payment record created');
    } catch (dbError) {
      console.error('❌ Database error:', dbError.message);
      // Continue anyway - payment intent is created
    }

    const response = {
      clientSecret: paymentIntent.client_secret,
      publishableKey: stripePublishableKey,
      payment_intent_id: paymentIntent.id,
      amount_breakdown: {
        base_amount: amount,
        platform_fee: platformFee,
        total_amount: totalAmount
      }
    };

    console.log('✅ Returning success response');
    return Response.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ 
      error: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, product_type, product_id } = await req.json();

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: product_type === 'premium_tier' ? 'Premium Affiliate Tier' : 
                  product_type === 'elite_tier' ? 'Elite Affiliate Tier' : 
                  'Affiliate Product',
            description: product_type === 'premium_tier' ? 'Unlock 8% commission rate' :
                        product_type === 'elite_tier' ? 'Unlock 10% commission rate + exclusive perks' :
                        'Purchase through affiliate program'
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/Wallet?payment=success&type=${product_type}`,
      cancel_url: `${req.headers.get('origin')}/AffiliateProgram?payment=cancelled`,
      metadata: {
        user_email: user.email,
        product_type,
        product_id: product_id || '',
      }
    });

    // Create payment record
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: amount,
      amount_rri: 0,
      method: 'stripe',
      status: 'pending',
      reference_type: 'other',
      reference_id: session.id,
      memo: `Payment for ${product_type}`,
      created_by: user.email
    });

    return Response.json({ 
      sessionId: session.id, 
      url: session.url 
    });
  } catch (error) {
    console.error('Payment error:', error);
    return Response.json({ 
      error: error.message || 'Payment processing failed' 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      amount, 
      connectedAccountId, 
      applicationFeeAmount,
      description,
      metadata = {},
      successUrl,
      cancelUrl 
    } = await req.json();

    if (!amount || !connectedAccountId) {
      return Response.json({ 
        error: 'Amount and connected account ID required' 
      }, { status: 400 });
    }

    const origin = new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description || 'Service Payment',
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount 
          ? Math.round(applicationFeeAmount * 100) 
          : Math.round(amount * 100 * 0.1), // 10% default platform fee
        transfer_data: {
          destination: connectedAccountId,
        },
        metadata: {
          ...metadata,
          user_email: user.email,
        },
      },
      success_url: successUrl || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${origin}/payment-cancelled`,
      customer_email: user.email,
    });

    return Response.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Create connect checkout error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
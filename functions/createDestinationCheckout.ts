import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-11-20.acacia',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      booking_type, // 'service', 'car_rental', 'experience', 'food_order'
      booking_id,
      provider_stripe_account_id,
      total_amount, // in USD
      platform_commission_rate, // 0.10 to 0.22
      booking_details,
      success_url,
      cancel_url
    } = await req.json();

    if (!provider_stripe_account_id || !total_amount || !platform_commission_rate) {
      return Response.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Calculate amounts in cents
    const totalCents = Math.round(total_amount * 100);
    const platformFeeCents = Math.round(totalCents * platform_commission_rate);

    // Create Stripe checkout session with destination charge
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: booking_details.title || `${booking_type} Booking`,
            description: booking_details.description,
            images: booking_details.image ? [booking_details.image] : undefined,
          },
          unit_amount: totalCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: provider_stripe_account_id,
        },
        metadata: {
          booking_type,
          booking_id: booking_id || '',
          customer_email: user.email,
          provider_earnings: (total_amount - (total_amount * platform_commission_rate)).toFixed(2),
        },
      },
      customer_email: user.email,
      metadata: {
        booking_type,
        booking_id: booking_id || '',
        customer_email: user.email,
      },
      success_url: success_url || `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/payment-cancelled`,
    });

    return Response.json({ 
      session_id: session.id,
      url: session.url,
      platform_fee: (total_amount * platform_commission_rate).toFixed(2),
      provider_earnings: (total_amount - (total_amount * platform_commission_rate)).toFixed(2),
    });

  } catch (error) {
    console.error('Checkout creation error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
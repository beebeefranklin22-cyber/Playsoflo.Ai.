import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id } = await req.json();

    if (!booking_id) {
      return Response.json({ error: 'Booking ID required' }, { status: 400 });
    }

    // Get booking details
    const bookings = await base44.asServiceRole.entities.Booking.filter({ id: booking_id });
    if (bookings.length === 0) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];

    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Payment system not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Calculate platform fee (15%)
    const platformFee = booking.total_price_usd * 0.15;
    const hostEarnings = booking.total_price_usd - platformFee;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.total_price_usd * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        booking_id: booking.id,
        host_email: booking.provider_email,
        guest_email: user.email
      }
    });

    // Record payment
    await base44.asServiceRole.entities.StripePayment.create({
      user_email: user.email,
      stripe_payment_intent_id: paymentIntent.id,
      amount: booking.total_price_usd,
      status: 'pending',
      reference_type: 'booking',
      reference_id: booking.id,
      description: `Property booking: ${booking.experience_title}`
    });

    return Response.json({
      client_secret: paymentIntent.client_secret,
      publishable_key: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
      amount: booking.total_price_usd,
      platform_fee: platformFee,
      host_earnings: hostEarnings
    });

  } catch (error) {
    console.error('Property payment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
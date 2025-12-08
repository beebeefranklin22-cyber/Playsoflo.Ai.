import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-11-20.acacia',
});

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );

    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { booking_type, booking_id, customer_email } = session.metadata;

      // Update booking status based on type
      if (booking_type === 'service' && booking_id) {
        await base44.asServiceRole.entities.ServiceBooking.update(booking_id, {
          payment_status: 'fully_paid',
          status: 'confirmed',
        });

        // Notify customer
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: customer_email,
          type: 'payment_received',
          title: '✅ Payment Confirmed',
          message: 'Your booking payment has been processed successfully.',
          reference_type: 'booking',
          reference_id: booking_id,
        });
      } else if (booking_type === 'car_rental' && booking_id) {
        await base44.asServiceRole.entities.CarRental.update(booking_id, {
          payment_status: 'fully_paid',
          status: 'confirmed',
        });

        await base44.asServiceRole.entities.Notification.create({
          recipient_email: customer_email,
          type: 'payment_received',
          title: '🚗 Rental Payment Confirmed',
          message: 'Your car rental payment has been processed.',
          reference_type: 'booking',
          reference_id: booking_id,
        });
      } else if (booking_type === 'experience' && booking_id) {
        await base44.asServiceRole.entities.Booking.update(booking_id, {
          payment_status: 'paid',
          status: 'confirmed',
        });
      } else if (booking_type === 'food_order' && booking_id) {
        await base44.asServiceRole.entities.FoodOrder.update(booking_id, {
          payment_status: 'paid',
          status: 'confirmed',
        });
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      const { booking_id, customer_email, booking_type } = paymentIntent.metadata;

      // Notify customer of failed payment
      if (customer_email) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: customer_email,
          type: 'system_alert',
          title: '❌ Payment Failed',
          message: 'Your payment could not be processed. Please try again.',
          reference_type: 'booking',
          reference_id: booking_id || '',
        });
      }
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});
import Stripe from 'npm:stripe@17.5.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return Response.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Handle different event types
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object;
        console.log('Account updated:', account.id);
        
        // Notify user if charges are enabled
        if (account.charges_enabled) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: account.email,
            type: 'account_update',
            title: '✅ Payment Account Activated',
            message: 'Your payment account is now ready to receive payments!',
            reference_type: 'stripe_account',
            reference_id: account.id,
          });
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Payment completed:', session.id);
        
        // Update payment status in database
        if (session.metadata?.payment_id) {
          await base44.asServiceRole.entities.StripePayment.update(
            session.metadata.payment_id,
            { status: 'succeeded' }
          );
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('Payment intent succeeded:', paymentIntent.id);
        
        // Notify seller
        if (paymentIntent.transfer_data?.destination) {
          const account = await stripe.accounts.retrieve(
            paymentIntent.transfer_data.destination
          );
          
          await base44.asServiceRole.entities.Notification.create({
            user_email: account.email,
            type: 'payment_received',
            title: '💰 Payment Received',
            message: `You received $${(paymentIntent.amount / 100).toFixed(2)}`,
            reference_type: 'payment_intent',
            reference_id: paymentIntent.id,
          });
        }
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object;
        console.log('Transfer created:', transfer.id);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
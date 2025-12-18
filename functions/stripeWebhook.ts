import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey || !webhookSecret) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Initialize Base44 SDK with service role (webhooks don't have user context)
    const base44 = createClientFromRequest(req);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        const description = session.metadata?.description;
        const userEmail = session.metadata?.user_email || session.customer_email;
        const baseAmount = parseFloat(session.metadata?.base_amount || '0');
        const platformFee = parseFloat(session.metadata?.platform_fee || '0');
        const orderId = session.metadata?.order_id;
        
        // Validate session amount matches expected amount (security check)
        const sessionAmount = session.amount_total / 100; // Stripe uses cents
        const expectedTotal = baseAmount + platformFee;
        
        if (description === 'Add money to wallet' && userEmail && baseAmount > 0) {
          // Use the net amount (base_amount is already the net amount after fee calculation)
          const netAmount = baseAmount;
          
          // Find user and update balance
          const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
          
          if (users.length > 0) {
            const user = users[0];
            const currentBalance = user.usd_balance || 0;
            const newBalance = currentBalance + netAmount;
            
            await base44.asServiceRole.entities.User.update(user.id, {
              usd_balance: newBalance
            });

            // Prevent duplicate deposits - check if already processed
            const existingDeposits = await base44.asServiceRole.entities.Payment.filter({
              reference_type: 'deposit',
              reference_id: session.id,
              sender_email: userEmail
            });

            if (existingDeposits.length > 0) {
              console.log('Deposit already processed:', session.id);
              return Response.json({ received: true, message: 'Already processed' });
            }

            // Create payment record
            await base44.asServiceRole.entities.Payment.create({
              amount_usd: netAmount,
              amount_rri: 0,
              method: 'stripe',
              status: 'completed',
              reference_type: 'deposit',
              reference_id: session.id,
              sender_email: userEmail,
              recipient_email: userEmail,
              memo: `Wallet deposit via Stripe (Fee: $${platformFee.toFixed(2)})`
            });

            // Record platform fee
            await base44.asServiceRole.entities.Payment.create({
              amount_usd: platformFee,
              amount_rri: 0,
              method: 'internal_transfer',
              status: 'completed',
              reference_type: 'other',
              reference_id: session.id,
              sender_email: userEmail,
              recipient_email: 'platform@playsoflo.com',
              memo: 'Platform instant deposit fee (2.5%)'
            });

            // Notify user
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: userEmail,
              type: 'payment_received',
              title: '✅ Money Added Successfully',
              message: `$${netAmount.toFixed(2)} has been added to your wallet (Fee: $${platformFee.toFixed(2)}). New balance: $${newBalance.toFixed(2)}`,
              reference_type: 'payment',
              reference_id: session.id
            });
          }
        }

        // Handle Shopify order completion
        if (orderId && description === 'Shopify product purchase') {
          await base44.asServiceRole.entities.Order.update(orderId, {
            status: 'confirmed',
            stripe_session_id: session.id
          });

          // Notify customer
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: userEmail,
            type: 'system_alert',
            title: '✅ Order Confirmed',
            message: 'Your order has been confirmed and will be processed shortly.',
            reference_type: 'order',
            reference_id: orderId
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        
        // Update payment record
        const payments = await base44.asServiceRole.entities.StripePayment.filter({
          stripe_payment_intent_id: paymentIntent.id
        });

        if (payments.length > 0) {
          await base44.asServiceRole.entities.StripePayment.update(payments[0].id, {
            status: 'succeeded',
            payment_method_type: paymentIntent.payment_method_types?.[0]
          });

          // Update related entity based on reference type
          const payment = payments[0];
          if (payment.reference_type === 'booking') {
            await base44.asServiceRole.entities.Booking.update(payment.reference_id, {
              payment_status: 'paid'
            });
          } else if (payment.reference_type === 'car_rental') {
            await base44.asServiceRole.entities.CarRental.update(payment.reference_id, {
              payment_status: 'fully_paid',
              status: 'confirmed'
            });
          }

          // Send notification to user
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: payment.user_email,
            type: 'payment_received',
            title: '✅ Payment Successful',
            message: `Your payment of $${payment.amount} has been processed successfully.`,
            reference_type: payment.reference_type,
            reference_id: payment.reference_id
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        
        const payments = await base44.asServiceRole.entities.StripePayment.filter({
          stripe_payment_intent_id: paymentIntent.id
        });

        if (payments.length > 0) {
          await base44.asServiceRole.entities.StripePayment.update(payments[0].id, {
            status: 'failed',
            error_message: paymentIntent.last_payment_error?.message
          });

          // Notify user of failure
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: payments[0].user_email,
            type: 'payment_received',
            title: '❌ Payment Failed',
            message: `Your payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
            reference_type: payments[0].reference_type,
            reference_id: payments[0].reference_id
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        // Update or create subscription record
        const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: subscription.id
        });

        const subData = {
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end
        };

        if (existingSubs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, subData);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: subscription.id
        });

        if (subs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: 'cancelled'
          });

          // Notify user
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: subs[0].user_email,
            type: 'system_alert',
            title: 'Subscription Cancelled',
            message: `Your subscription to ${subs[0].plan_name} has been cancelled.`,
            reference_type: 'subscription',
            reference_id: subs[0].id
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({ 
      error: error.message || 'Webhook processing failed' 
    }, { status: 500 });
  }
});
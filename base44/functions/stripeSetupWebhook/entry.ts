import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.4.0';

Deno.serve(async (req) => {
  console.log('🔔 Webhook received');
  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    console.log('✓ Keys present:', { 
      hasSecretKey: !!stripeSecretKey, 
      hasWebhookSecret: !!webhookSecret 
    });

    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    console.log('📝 Webhook body length:', body.length);
    console.log('📝 Has signature:', !!signature);

    let event;
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          webhookSecret
        );
        console.log('✅ Signature verified, event type:', event.type);
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return Response.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      console.log('⚠️ No webhook secret or signature, parsing without verification');
      event = JSON.parse(body);
    }

    const base44 = createClientFromRequest(req);

    // Handle setup session completion (card saved)
    if (event.type === 'checkout.session.completed' && event.data.object.mode === 'setup') {
      const session = event.data.object;
      const userEmail = session.metadata?.user_email;

      if (userEmail && session.setup_intent) {
        const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent);
        const paymentMethod = await stripe.paymentMethods.retrieve(setupIntent.payment_method);

        // Save payment method to database
        await base44.asServiceRole.entities.PaymentMethod.create({
          user_email: userEmail,
          type: paymentMethod.type,
          stripe_payment_method_id: paymentMethod.id,
          is_default: false,
          card_details: paymentMethod.card ? {
            last4: paymentMethod.card.last4,
            brand: paymentMethod.card.brand,
            exp_month: paymentMethod.card.exp_month,
            exp_year: paymentMethod.card.exp_year
          } : null,
          bank_details: paymentMethod.us_bank_account ? {
            last4: paymentMethod.us_bank_account.last4,
            bank_name: paymentMethod.us_bank_account.bank_name,
            account_type: paymentMethod.us_bank_account.account_type
          } : null,
          status: 'active'
        });
      }
    }

    // Handle payment intent success
    if (event.type === 'payment_intent.succeeded') {
      console.log('💰 Processing payment_intent.succeeded event');
      const paymentIntent = event.data.object;
      const userEmail = paymentIntent.metadata?.user_email;
      const referenceType = paymentIntent.metadata?.reference_type;
      const baseAmount = parseFloat(paymentIntent.metadata?.base_amount || 0);
      
      console.log('💰 Payment details:', {
        paymentIntentId: paymentIntent.id,
        userEmail,
        referenceType,
        baseAmount
      });
      
      // Update payment record
      const payments = await base44.asServiceRole.entities.StripePayment.filter({
        stripe_payment_intent_id: paymentIntent.id
      });

      if (payments.length > 0) {
        await base44.asServiceRole.entities.StripePayment.update(payments[0].id, {
          status: 'succeeded',
          payment_method_type: paymentIntent.payment_method_types?.[0]
        });
        console.log('✓ Updated payment record');
      }

      // If this is a deposit, update user balance
      if (userEmail && referenceType === 'deposit' && baseAmount > 0) {
        try {
          const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
          if (users && users.length > 0) {
            const currentBalance = users[0].usd_balance || 0;
            const newBalance = currentBalance + baseAmount;
            
            await base44.asServiceRole.entities.User.update(users[0].id, {
              usd_balance: newBalance
            });
            console.log(`✓ Updated balance: $${currentBalance} → $${newBalance}`);

            // Create payment transaction record
            await base44.asServiceRole.entities.Payment.create({
              amount_usd: baseAmount,
              amount_rri: 0,
              method: "stripe",
              status: "completed",
              reference_type: "deposit",
              memo: `Added $${baseAmount.toFixed(2)} to wallet via Stripe`
            });
            console.log('✓ Created payment record');

            // Create notification for successful payment
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: userEmail,
              type: "payment_received",
              title: "Payment Successful",
              message: `$${baseAmount.toFixed(2)} has been added to your wallet`,
              read: false,
              action_url: "/Wallet"
            });
            console.log('✓ Created notification');
          } else {
            console.error('❌ User not found:', userEmail);
          }
        } catch (error) {
          console.error('❌ Failed to update balance:', error);
          throw error;
        }
      }
    }

    // Handle payment intent failure
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      const userEmail = paymentIntent.metadata?.user_email;
      const amount = parseFloat(paymentIntent.metadata?.base_amount || 0);
      const errorCode = paymentIntent.last_payment_error?.code;
      const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
      const declineCode = paymentIntent.last_payment_error?.decline_code;

      // Generate user-friendly message
      let userMessage = 'Your payment failed. Please try again or use a different payment method.';
      let suggestedAction = 'Try again or contact support.';

      if (declineCode === 'insufficient_funds' || errorCode === 'insufficient_funds') {
        userMessage = 'Your card has insufficient funds.';
        suggestedAction = 'Please use a different card or add funds.';
      } else if (declineCode === 'card_declined' || errorCode === 'card_declined') {
        userMessage = 'Your card was declined.';
        suggestedAction = 'Please try a different payment method or contact your bank.';
      } else if (errorCode === 'expired_card') {
        userMessage = 'Your card has expired.';
        suggestedAction = 'Please update your card or use a different one.';
      }

      // Log failed payment for admin review
      try {
        await base44.asServiceRole.entities.FailedPayment.create({
          user_email: userEmail,
          amount,
          currency: paymentIntent.currency,
          payment_method_type: paymentIntent.payment_method_types?.[0],
          error_code: errorCode || declineCode,
          error_message: errorMessage,
          user_friendly_message: userMessage,
          suggested_action: suggestedAction,
          stripe_payment_intent_id: paymentIntent.id,
          reference_type: paymentIntent.metadata?.reference_type,
          reference_id: paymentIntent.metadata?.reference_id,
          metadata: {
            decline_code: declineCode,
            payment_error: paymentIntent.last_payment_error
          }
        });
        console.log('✓ Logged failed payment for admin review');
      } catch (logError) {
        console.error('Failed to log payment failure:', logError);
      }

      // Notify user
      if (userEmail) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: userEmail,
          type: "payment_received",
          title: "Payment Failed",
          message: `${userMessage} Amount: $${amount.toFixed(2)}. ${suggestedAction}`,
          read: false,
          action_url: "/Wallet"
        });
        console.log('✓ Created failure notification');
      }

      // Update payment record if exists
      const payments = await base44.asServiceRole.entities.StripePayment.filter({
        stripe_payment_intent_id: paymentIntent.id
      });

      if (payments.length > 0) {
        await base44.asServiceRole.entities.StripePayment.update(payments[0].id, {
          status: 'failed',
          error_message: userMessage
        });
      }
    }

    console.log('✅ Webhook processed successfully');
    return Response.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
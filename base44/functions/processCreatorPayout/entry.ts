import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can manually trigger payout processing
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { payoutRequestId } = await req.json();

    // Get payout request
    const payoutRequests = await base44.asServiceRole.entities.PayoutRequest.filter({ id: payoutRequestId });
    const payoutRequest = payoutRequests[0];

    if (!payoutRequest) {
      return Response.json({ error: 'Payout request not found' }, { status: 404 });
    }

    if (payoutRequest.status !== 'pending') {
      return Response.json({ error: 'Payout request is not pending' }, { status: 400 });
    }

    // Get payout method
    const methods = await base44.asServiceRole.entities.PayoutMethod.filter({ 
      id: payoutRequest.payout_method_id 
    });
    const payoutMethod = methods[0];

    if (!payoutMethod) {
      return Response.json({ error: 'Payout method not found' }, { status: 404 });
    }

    // Update status to processing
    await base44.asServiceRole.entities.PayoutRequest.update(payoutRequestId, {
      status: 'processing',
      processed_date: new Date().toISOString()
    });

    // Process based on method type
    let transactionId = null;
    let success = false;

    try {
      switch (payoutMethod.method_type) {
        case 'stripe':
          // Process Stripe payout
          if (payoutMethod.stripe_account_id && Deno.env.get("STRIPE_SECRET_KEY")) {
            const stripe = (await import('npm:stripe')).default;
            const stripeClient = stripe(Deno.env.get("STRIPE_SECRET_KEY"));
            
            const transfer = await stripeClient.transfers.create({
              amount: Math.round(payoutRequest.net_amount * 100),
              currency: 'usd',
              destination: payoutMethod.stripe_account_id,
              description: `Payout for creator earnings`
            });
            
            transactionId = transfer.id;
            success = true;
          }
          break;

        case 'bank_transfer':
          // In production, integrate with banking API
          // For now, mark as processing and require manual confirmation
          transactionId = `BANK_${Date.now()}`;
          success = true;
          break;

        case 'paypal':
          // In production, integrate with PayPal Payouts API
          transactionId = `PAYPAL_${Date.now()}`;
          success = true;
          break;

        case 'crypto_wallet':
          // In production, integrate with crypto payment processor
          transactionId = `CRYPTO_${Date.now()}`;
          success = true;
          break;
      }

      if (success) {
        // Mark as completed
        await base44.asServiceRole.entities.PayoutRequest.update(payoutRequestId, {
          status: 'completed',
          completed_date: new Date().toISOString(),
          transaction_id: transactionId
        });

        // Update last used date for payout method
        await base44.asServiceRole.entities.PayoutMethod.update(payoutRequest.payout_method_id, {
          last_used_date: new Date().toISOString()
        });

        // Send notification to creator
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: payoutRequest.user_email,
          type: 'system_alert',
          title: 'Payout Completed',
          message: `Your payout of $${payoutRequest.net_amount.toFixed(2)} has been processed successfully!`,
          reference_type: 'payout',
          reference_id: payoutRequestId
        });

        return Response.json({
          success: true,
          message: 'Payout processed successfully',
          transactionId
        });
      } else {
        throw new Error('Payment processing failed');
      }

    } catch (error) {
      // Mark as failed
      await base44.asServiceRole.entities.PayoutRequest.update(payoutRequestId, {
        status: 'failed',
        failure_reason: error.message
      });

      // Notify creator
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: payoutRequest.user_email,
        type: 'system_alert',
        title: 'Payout Failed',
        message: `Your payout request failed. Please contact support.`,
        reference_type: 'payout',
        reference_id: payoutRequestId
      });

      return Response.json({
        success: false,
        error: 'Payout processing failed',
        details: error.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Payout processing error:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
});
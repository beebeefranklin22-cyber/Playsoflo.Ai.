import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get session metadata from webhook
    const { session_id, metadata } = await req.json();

    if (!session_id || !metadata) {
      return Response.json({ error: 'Missing session data' }, { status: 400 });
    }

    const userEmail = metadata.user_email;
    const affiliateCommission = parseFloat(metadata.affiliate_commission || '0');
    const productId = metadata.product_id;

    // Update order status
    const orders = await base44.asServiceRole.entities.Order.filter({
      stripe_session_id: session_id
    });

    if (orders.length > 0) {
      const order = orders[0];
      
      await base44.asServiceRole.entities.Order.update(order.id, {
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      });

      // Pay affiliate commission instantly to user's wallet
      if (affiliateCommission > 0) {
        const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
        
        if (users.length > 0) {
          const userToUpdate = users[0];
          const currentBalance = parseFloat(userToUpdate.usd_balance) || 0;
          const newBalance = currentBalance + affiliateCommission;

          await base44.asServiceRole.entities.User.update(userToUpdate.id, {
            usd_balance: newBalance,
            total_affiliate_earnings: (parseFloat(userToUpdate.total_affiliate_earnings) || 0) + affiliateCommission
          });

          // Create payment record
          await base44.asServiceRole.entities.Payment.create({
            amount_usd: affiliateCommission,
            amount_rri: 0,
            method: 'internal_transfer',
            status: 'completed',
            reference_type: 'affiliate_commission',
            reference_id: order.id,
            sender_email: 'platform@playsoflo.com',
            recipient_email: userEmail,
            memo: `Affiliate commission for ${metadata.product_id}`
          });

          // Notify user
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: userEmail,
            type: 'payment_received',
            title: '🎉 Commission Earned!',
            message: `You earned $${affiliateCommission.toFixed(2)} commission! Added to your wallet instantly.`,
            reference_type: 'order',
            reference_id: order.id
          });
        }
      }

      // Notify customer of order confirmation
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: userEmail,
        type: 'system_alert',
        title: '✅ Order Confirmed',
        message: `Your order for ${order.item_name} has been confirmed! Tracking info will be sent shortly.`,
        reference_type: 'order',
        reference_id: order.id
      });

      // Track affiliate conversion
      if (user.referral_code) {
        await base44.asServiceRole.entities.AffiliateReferral.create({
          referrer_code: user.referral_code,
          referred_email: userEmail,
          conversion_type: 'product_purchase',
          commission_amount: affiliateCommission,
          order_id: order.id,
          product_id: productId
        });
      }
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Shopify order processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
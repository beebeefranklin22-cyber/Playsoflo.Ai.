import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id, new_status, message } = await req.json();

    if (!order_id || !new_status) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the delivery order
    const orders = await base44.asServiceRole.entities.DeliveryOrder.filter({ id: order_id });
    
    if (orders.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Verify driver owns this order
    if (order.driver_email !== user.email) {
      return Response.json({ error: 'Unauthorized - not your delivery' }, { status: 403 });
    }

    // Build updates
    const updates = {
      status: new_status,
      tracking_updates: [
        ...(order.tracking_updates || []),
        {
          timestamp: new Date().toISOString(),
          status: new_status,
          message: message || `Status updated to ${new_status}`,
          location: order.delivery_address
        }
      ]
    };

    if (new_status === 'picked_up') {
      updates.pickup_time = new Date().toISOString();
    } else if (new_status === 'delivered') {
      updates.delivery_time = new Date().toISOString();
      updates.payment_status = 'paid';

      // Verify payment hasn't already been made (prevent double-payment)
      const existingPayments = await base44.asServiceRole.entities.Payment.filter({
        reference_type: 'other',
        reference_id: order.id,
        recipient_email: user.email,
        memo: 'Delivery driver earnings'
      });

      if (existingPayments.length > 0) {
        console.log('Driver already paid for this delivery');
      } else {
        // Pay driver instantly via service role
        const driverPayout = parseFloat(order.driver_earnings) || 0;
        
        if (driverPayout > 0) {
          const driver = await base44.asServiceRole.entities.User.filter({ email: user.email });
          
          if (driver.length > 0) {
            const currentBalance = parseFloat(driver[0].usd_balance) || 0;
            const newBalance = currentBalance + driverPayout;
            
            // Update driver balance and stats instantly
            await base44.asServiceRole.entities.User.update(driver[0].id, {
              usd_balance: newBalance,
              total_deliveries_completed: (driver[0].total_deliveries_completed || 0) + 1,
              total_delivery_earnings: (driver[0].total_delivery_earnings || 0) + driverPayout
            });

            // Record payment
            await base44.asServiceRole.entities.Payment.create({
              amount_usd: driverPayout,
              amount_rri: 0,
              method: 'internal_transfer',
              status: 'completed',
              reference_type: 'other',
              reference_id: order.id,
              recipient_email: user.email,
              sender_email: 'platform@playsoflo.com',
              memo: 'Delivery driver earnings'
            });

            // Notify driver instantly
            await base44.asServiceRole.entities.Notification.create({
              recipient_email: user.email,
              type: 'payment_received',
              title: '💰 Delivery Payment Received',
              message: `$${driverPayout.toFixed(2)} instantly added to your wallet! New balance: $${newBalance.toFixed(2)}`,
              reference_type: 'delivery',
              reference_id: order.id
            });
          }
        }
      }

      // Notify recipient
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: order.recipient_email || order.sender_email,
        type: 'system_alert',
        title: '📦 Package Delivered',
        message: `Your package #${order.order_number?.substring(0, 8)} has been delivered! Tap to rate your experience.`,
        reference_type: 'delivery',
        reference_id: order.id
      });

      // Update franchise stats
      if (order.franchise_id) {
        const franchises = await base44.asServiceRole.entities.DeliveryFranchise.filter({
          id: order.franchise_id
        });
        
        if (franchises.length > 0) {
          const franchise = franchises[0];
          await base44.asServiceRole.entities.DeliveryFranchise.update(order.franchise_id, {
            total_deliveries: (franchise.total_deliveries || 0) + 1
          });
        }
      }
    }

    // Update order
    await base44.asServiceRole.entities.DeliveryOrder.update(order_id, updates);

    return Response.json({ success: true, updates });

  } catch (error) {
    console.error('Delivery completion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
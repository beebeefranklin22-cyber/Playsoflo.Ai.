import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * settleDeliveryPayment
 * ─────────────────────
 * Secure, idempotent settlement of driver earnings on delivery completion.
 * Called internally by completeDelivery (or directly by admin/automation).
 *
 * Fee model:
 *   Customer pays:  subtotal + 15% platform fee = total_price
 *   Driver earns:   85% of subtotal (excludes insurance & platform fee)
 *   Platform keeps: 15% platform fee + insurance fee
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id } = await req.json();

    if (!order_id) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    // ── Fetch order ────────────────────────────────────────────────────────
    const orders = await base44.asServiceRole.entities.DeliveryOrder.filter({ id: order_id });
    if (orders.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    const order = orders[0];

    // Only the assigned driver or an admin may trigger settlement
    if (order.driver_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Order must be in delivered state
    if (order.status !== 'delivered') {
      return Response.json({ error: 'Order is not yet delivered' }, { status: 400 });
    }

    // ── Idempotency guard ──────────────────────────────────────────────────
    const existingPayments = await base44.asServiceRole.entities.Payment.filter({
      reference_id: order.id,
      memo: 'Delivery driver earnings',
      status: 'completed'
    });
    if (existingPayments.length > 0) {
      return Response.json({
        success: true,
        already_settled: true,
        message: 'Payment already processed for this delivery',
        payment_id: existingPayments[0].id
      });
    }

    // ── Recalculate earnings from stored order fields ───────────────────────
    const totalPrice   = parseFloat(order.total_price)   || 0;
    const platformFee  = parseFloat(order.platform_fee)  || 0;
    const insuranceFee = parseFloat(order.insurance_fee) || 0;

    // Subtotal = what customer paid minus platform fee
    const subtotal = totalPrice - platformFee;

    // Driver earns 85% of subtotal (surge already baked in via calculateDeliveryPrice)
    const driverEarnings = parseFloat(order.driver_earnings)
      || parseFloat((subtotal * 0.85).toFixed(2));

    // Platform revenue = platform_fee + insurance_fee
    const platformRevenue = parseFloat((platformFee + insuranceFee).toFixed(2));

    if (driverEarnings <= 0) {
      return Response.json({ error: 'Invalid driver earnings amount' }, { status: 400 });
    }

    const driverEmail = order.driver_email;

    // ── Fetch driver user record ───────────────────────────────────────────
    const drivers = await base44.asServiceRole.entities.User.filter({ email: driverEmail });
    if (drivers.length === 0) {
      return Response.json({ error: 'Driver account not found' }, { status: 404 });
    }
    const driver = drivers[0];

    const currentBalance    = parseFloat(driver.usd_balance) || 0;
    const newBalance        = parseFloat((currentBalance + driverEarnings).toFixed(2));
    const totalDeliveries   = (driver.total_deliveries_completed || 0) + 1;
    const totalEarnings     = parseFloat(((driver.total_delivery_earnings || 0) + driverEarnings).toFixed(2));

    // ── Atomic updates ─────────────────────────────────────────────────────
    // 1. Credit driver wallet
    await base44.asServiceRole.entities.User.update(driver.id, {
      usd_balance: newBalance,
      total_deliveries_completed: totalDeliveries,
      total_delivery_earnings: totalEarnings
    });

    // 2. Record payment ledger entry
    const payment = await base44.asServiceRole.entities.Payment.create({
      amount_usd: driverEarnings,
      amount_rri: 0,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'other',
      reference_id: order.id,
      recipient_email: driverEmail,
      sender_email: 'platform@playsoflo.com',
      memo: 'Delivery driver earnings',
      metadata: JSON.stringify({
        order_number: order.order_number,
        total_price: totalPrice,
        subtotal: subtotal,
        platform_fee: platformFee,
        insurance_fee: insuranceFee,
        driver_earnings: driverEarnings,
        platform_revenue: platformRevenue,
        surge_multiplier: order.surge_multiplier || 1.0,
        settled_at: new Date().toISOString()
      })
    });

    // 3. Update DriverStats if entity exists
    const driverStatsList = await base44.asServiceRole.entities.DriverStats.filter({ driver_email: driverEmail });
    if (driverStatsList.length > 0) {
      const stats = driverStatsList[0];
      await base44.asServiceRole.entities.DriverStats.update(stats.id, {
        total_deliveries: (stats.total_deliveries || 0) + 1,
        total_earnings: parseFloat(((stats.total_earnings || 0) + driverEarnings).toFixed(2)),
        last_delivery_date: new Date().toISOString()
      });
    }

    // 4. Mark order payment_status as settled
    await base44.asServiceRole.entities.DeliveryOrder.update(order.id, {
      payment_status: 'paid',
      settlement_payment_id: payment.id
    });

    // 5. Push notification to driver
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: driverEmail,
      type: 'payment_received',
      title: '💰 Earnings Credited!',
      message: `$${driverEarnings.toFixed(2)} added to your wallet for order #${order.order_number?.substring(0, 8)}. New balance: $${newBalance.toFixed(2)}`,
      reference_type: 'delivery',
      reference_id: order.id,
      read: false
    });

    return Response.json({
      success: true,
      settlement: {
        order_id: order.id,
        order_number: order.order_number,
        driver_email: driverEmail,
        total_price: totalPrice,
        subtotal: subtotal,
        platform_fee: platformFee,
        insurance_fee: insuranceFee,
        driver_earnings: driverEarnings,
        platform_revenue: platformRevenue,
        new_wallet_balance: newBalance,
        payment_id: payment.id,
        settled_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Settlement error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
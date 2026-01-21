import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id, restaurant_email, cancellation_reason } = await req.json();

    if (!order_id || !restaurant_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the order
    const orders = await base44.entities.FoodOrder.filter({ id: order_id });
    const order = orders[0];

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify restaurant owns this order
    if (order.restaurant_email !== restaurant_email) {
      return Response.json({ error: 'Unauthorized to cancel this order' }, { status: 403 });
    }

    // Prevent cancellation of already delivered/cancelled orders
    if (['delivered', 'cancelled'].includes(order.status)) {
      return Response.json({ error: 'Cannot cancel this order' }, { status: 400 });
    }

    // Calculate refund amount (full refund if cancelled before preparing)
    const refundAmount = order.total;
    const customerEmail = order.created_by;

    // Process refund using service role
    const customers = await base44.asServiceRole.entities.User.filter({ email: customerEmail });
    if (customers.length > 0) {
      await base44.asServiceRole.entities.User.update(customers[0].id, {
        balance_usd: (customers[0].balance_usd || 0) + refundAmount
      });
    }

    // Update order status
    await base44.entities.FoodOrder.update(order_id, {
      status: 'cancelled',
      cancellation_reason: cancellation_reason,
      refund_amount: refundAmount,
      cancelled_by: 'restaurant'
    });

    // Create refund payment record
    await base44.entities.Payment.create({
      amount_usd: refundAmount,
      amount_rri: 0,
      method: "wallet",
      status: "completed",
      reference_type: "other",
      reference_id: order_id,
      sender_email: restaurant_email,
      recipient_email: customerEmail,
      memo: `Order refund - ${cancellation_reason}`
    });

    // Notify customer
    await base44.entities.Notification.create({
      recipient_email: customerEmail,
      type: "order_cancelled",
      title: "Order Cancelled",
      message: `Your order has been cancelled by the restaurant. $${refundAmount.toFixed(2)} refunded to your wallet. Reason: ${cancellation_reason}`,
      reference_id: order_id,
      reference_type: "food_order",
      read: false
    });

    return Response.json({
      success: true,
      refund_amount: refundAmount,
      message: "Order cancelled and customer refunded"
    });

  } catch (error) {
    console.error("Order cancellation error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
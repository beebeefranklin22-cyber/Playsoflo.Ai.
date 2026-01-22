import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id, status, tracking_number, carrier } = await req.json();

    if (!order_id || !status) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get order and verify ownership or admin
    const orders = await base44.entities.Order.filter({ id: order_id });
    
    if (orders.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Only order owner or admin can update
    if (order.user_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized to update this order' }, { status: 403 });
    }

    // Update order with new status
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };

    if (tracking_number) {
      updateData.tracking_number = tracking_number;
    }

    if (carrier) {
      updateData.carrier = carrier;
    }

    if (status === 'shipped' && !order.shipped_at) {
      updateData.shipped_at = new Date().toISOString();
    }

    if (status === 'delivered' && !order.delivered_at) {
      updateData.delivered_at = new Date().toISOString();
    }

    await base44.asServiceRole.entities.Order.update(order.id, updateData);

    // Send notification to customer
    const statusMessages = {
      confirmed: '✅ Your order has been confirmed',
      processing: '📦 Your order is being prepared',
      shipped: '🚚 Your order has been shipped',
      in_transit: '🚛 Your order is on the way',
      out_for_delivery: '🏃 Out for delivery today',
      delivered: '✅ Order delivered successfully',
      cancelled: '❌ Order has been cancelled'
    };

    await base44.asServiceRole.entities.Notification.create({
      recipient_email: order.user_email,
      type: 'system_alert',
      title: 'Order Update',
      message: statusMessages[status] || `Order status: ${status}`,
      reference_type: 'order',
      reference_id: order.id
    });

    return Response.json({ 
      success: true,
      order: {
        id: order.id,
        status: status,
        tracking_number: tracking_number,
        carrier: carrier
      }
    });

  } catch (error) {
    console.error('Delivery tracking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
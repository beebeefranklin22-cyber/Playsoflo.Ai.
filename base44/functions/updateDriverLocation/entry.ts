import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id, location } = await req.json();

    if (!order_id || !location || location.length !== 2) {
      return Response.json({ error: 'Invalid request data' }, { status: 400 });
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

    // Update driver location
    await base44.asServiceRole.entities.DeliveryOrder.update(order_id, {
      driver_location: location,
      driver_location_updated_at: new Date().toISOString()
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Location update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
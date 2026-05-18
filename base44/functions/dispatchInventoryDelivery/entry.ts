import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * dispatchInventoryDelivery
 * Called when a customer places a local_delivery order from an inventory store.
 * 1. Creates a DeliveryOrder record
 * 2. Notifies seller to prepare the item
 * 3. Notifies available in-app drivers
 * 4. Updates Order with delivery_order_id
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { order_id } = await req.json();
    if (!order_id) return Response.json({ error: 'Missing order_id' }, { status: 400 });

    // Fetch the order
    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    if (!orders.length) return Response.json({ error: 'Order not found' }, { status: 404 });
    const order = orders[0];

    // Parse address
    let deliveryAddress = 'Customer address';
    try {
      const parsed = JSON.parse(order.shipping_address || '{}');
      deliveryAddress = [parsed.street, parsed.city, parsed.state, parsed.zip].filter(Boolean).join(', ');
    } catch {}

    // Get store info for pickup address
    const storeSettings = await base44.asServiceRole.entities.StoreSettings.filter({ owner_email: order.provider_email });
    const pickupAddress = storeSettings[0]?.fulfillment_options?.pickup_address || `Store: ${order.provider_email}`;

    const orderNumber = `DLV${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const deliveryFee = 5.00; // Default delivery fee
    const platformFee = parseFloat((deliveryFee * 0.15).toFixed(2));
    const driverEarnings = parseFloat((deliveryFee * 0.85).toFixed(2));

    // Create DeliveryOrder
    const deliveryOrder = await base44.asServiceRole.entities.DeliveryOrder.create({
      order_number: orderNumber,
      sender_name: storeSettings[0]?.store_name || 'Store',
      sender_phone: 'N/A',
      sender_email: order.provider_email,
      pickup_address: pickupAddress,
      recipient_name: user.full_name || user.email,
      recipient_phone: user.phone || 'N/A',
      recipient_email: user.email,
      delivery_address: deliveryAddress,
      package_type: 'small_box',
      package_description: order.product_name,
      delivery_type: 'standard',
      urgency_level: 'normal',
      base_price: deliveryFee,
      platform_fee: platformFee,
      driver_earnings: driverEarnings,
      total_price: deliveryFee,
      status: 'pending',
      payment_status: 'paid',
      tracking_updates: [{
        timestamp: new Date().toISOString(),
        status: 'pending',
        message: 'Order received — driver being assigned',
        location: pickupAddress
      }],
      special_instructions: `Inventory Order #${order_id}`
    });

    // Update the Order with the delivery_order_id
    await base44.asServiceRole.entities.Order.update(order_id, {
      delivery_order_id: deliveryOrder.id,
      status: 'confirmed'
    });

    // Notify the seller
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: order.provider_email,
      type: 'system_alert',
      title: '📦 New Local Delivery Order',
      message: `${order.product_name} ordered for local delivery. Order #${orderNumber.substring(0, 12)}. Please prepare the item for driver pickup.`,
      reference_type: 'delivery',
      reference_id: deliveryOrder.id,
      read: false
    });

    // Notify available in-app delivery drivers
    let notifiedDrivers = 0;
    try {
      const vehicles = await base44.asServiceRole.entities.DeliveryVehicle.filter({ is_active: true });
      for (const vehicle of vehicles.slice(0, 10)) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: vehicle.driver_email,
          type: 'system_alert',
          title: '🛵 New Delivery Job Available',
          message: `Local delivery: ${order.product_name} from ${pickupAddress.substring(0, 40)} → ${deliveryAddress.substring(0, 40)}. Earn $${driverEarnings.toFixed(2)}.`,
          reference_type: 'delivery',
          reference_id: deliveryOrder.id,
          read: false
        });
        notifiedDrivers++;
      }
    } catch (err) {
      console.log('Driver notification error (non-fatal):', err.message);
    }

    // Notify the customer
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: user.email,
      type: 'system_alert',
      title: '✅ Order Placed — Driver Being Assigned',
      message: `Your order for "${order.product_name}" is confirmed. Tracking #${orderNumber.substring(0, 12)}. A driver will be assigned shortly.`,
      reference_type: 'delivery',
      reference_id: deliveryOrder.id,
      read: false
    });

    return Response.json({
      success: true,
      delivery_order_id: deliveryOrder.id,
      order_number: orderNumber,
      driver_earnings: driverEarnings,
      notified_drivers: notifiedDrivers
    });

  } catch (error) {
    console.error('dispatchInventoryDelivery error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
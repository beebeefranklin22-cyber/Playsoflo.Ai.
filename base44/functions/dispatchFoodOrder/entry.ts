import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * dispatchFoodOrder
 * Called after successful Stripe payment on a marketplace food order.
 * 1. Creates a DeliveryOrder linked to the marketplace Order
 * 2. Notifies the restaurant/provider
 * 3. Notifies nearby available food delivery drivers
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      order_id,
      item_title,
      provider_email,
      delivery_address,
      price,
      payment_intent_id
    } = await req.json();

    if (!order_id || !provider_email || !delivery_address) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const orderNumber = `FOOD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const platformFee = parseFloat((price * 0.10).toFixed(2));
    const driverEarnings = parseFloat((price * 0.15).toFixed(2));

    // Create the DeliveryOrder
    const deliveryOrder = await base44.asServiceRole.entities.DeliveryOrder.create({
      order_number: orderNumber,
      sender_name: item_title || 'Restaurant',
      sender_phone: 'N/A',
      sender_email: provider_email,
      pickup_address: `Provider: ${provider_email}`,
      recipient_name: user.full_name || user.email,
      recipient_phone: user.phone || 'N/A',
      recipient_email: user.email,
      delivery_address: delivery_address,
      package_type: 'food',
      package_description: item_title,
      delivery_type: 'same_day',
      urgency_level: 'urgent',
      base_price: price,
      platform_fee: platformFee,
      driver_earnings: driverEarnings,
      total_price: price,
      status: 'pending',
      payment_status: 'paid',
      payment_method: 'stripe',
      tracking_updates: [{
        timestamp: new Date().toISOString(),
        status: 'pending',
        message: 'Order received, finding a driver',
        location: delivery_address
      }],
      special_instructions: `Marketplace Order #${order_id} | Payment: ${payment_intent_id}`
    });

    // Notify the restaurant/provider
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: provider_email,
      type: 'system_alert',
      title: '🍽️ New Order Received',
      message: `You have a new food order: ${item_title}. Order #${orderNumber.substring(0, 10)}. Please prepare for pickup.`,
      reference_type: 'delivery',
      reference_id: deliveryOrder.id,
      read: false
    });

    // Find active food delivery drivers
    let notifiedDrivers = 0;
    try {
      const vehicles = await base44.asServiceRole.entities.DeliveryVehicle.filter({ is_active: true });
      const foodDrivers = vehicles.filter(v =>
        !v.can_transport || v.can_transport.includes('food') || v.can_transport.includes('small_box')
      );

      for (const vehicle of foodDrivers) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: vehicle.driver_email,
          type: 'system_alert',
          title: '🍕 New Food Delivery Job',
          message: `Food order available: ${item_title}. Deliver to ${delivery_address}. Earn $${driverEarnings.toFixed(2)}. Tap to accept.`,
          reference_type: 'delivery',
          reference_id: deliveryOrder.id,
          read: false
        });
        notifiedDrivers++;
      }

      // Also notify food delivery hub drivers (role = food_driver)
      const allUsers = await base44.asServiceRole.entities.User.filter({ role: 'food_driver' });
      for (const driver of allUsers) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: driver.email,
          type: 'system_alert',
          title: '🍕 New Food Delivery Job',
          message: `Food order available: ${item_title}. Earn $${driverEarnings.toFixed(2)}. Tap to accept.`,
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
      title: '✅ Order Confirmed!',
      message: `Your order for ${item_title} has been confirmed. Order #${orderNumber.substring(0, 10)}. A driver will be assigned shortly.`,
      reference_type: 'delivery',
      reference_id: deliveryOrder.id,
      read: false
    });

    return Response.json({
      success: true,
      delivery_order_id: deliveryOrder.id,
      order_number: orderNumber,
      notified_drivers: notifiedDrivers
    });

  } catch (error) {
    console.error('dispatchFoodOrder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * dispatchProductOrder
 * Called after successful payment on a non-food physical product/package order.
 * 1. Creates a DeliveryOrder record linked to the marketplace Order
 * 2. Notifies the seller/provider to prepare the package
 * 3. Notifies nearby available package delivery drivers
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
      payment_intent_id,
      package_type   // optional: 'small_box', 'medium_box', 'large_box', etc.
    } = await req.json();

    if (!order_id || !provider_email || !delivery_address) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const orderNumber = `PKG${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const platformFee = parseFloat((price * 0.10).toFixed(2));
    const driverEarnings = parseFloat((price * 0.12).toFixed(2));
    const resolvedPackageType = package_type || 'small_box';

    // Create DeliveryOrder
    const deliveryOrder = await base44.asServiceRole.entities.DeliveryOrder.create({
      order_number: orderNumber,
      sender_name: item_title || 'Marketplace Seller',
      sender_phone: 'N/A',
      sender_email: provider_email,
      pickup_address: `Seller: ${provider_email}`,
      recipient_name: user.full_name || user.email,
      recipient_phone: user.phone || 'N/A',
      recipient_email: user.email,
      delivery_address: delivery_address,
      package_type: resolvedPackageType,
      package_description: item_title,
      delivery_type: 'standard',
      urgency_level: 'normal',
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
        message: 'Order received, awaiting seller to prepare package',
        location: delivery_address
      }],
      special_instructions: `Marketplace Order #${order_id} | Payment: ${payment_intent_id}`
    });

    // Notify the seller/provider to prepare shipment
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: provider_email,
      type: 'system_alert',
      title: '📦 New Order — Prepare for Shipment',
      message: `New order received: "${item_title}". Order #${orderNumber.substring(0, 12)}. Please package and hand off to a driver for delivery.`,
      reference_type: 'delivery',
      reference_id: deliveryOrder.id,
      read: false
    });

    // Notify nearby available package drivers
    let notifiedDrivers = 0;
    try {
      const vehicles = await base44.asServiceRole.entities.DeliveryVehicle.filter({ is_active: true });
      const eligible = vehicles.filter(v =>
        !v.can_transport ||
        v.can_transport.includes(resolvedPackageType) ||
        v.can_transport.includes('small_box') ||
        v.can_transport.includes('medium_box')
      );

      for (const vehicle of eligible) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: vehicle.driver_email,
          type: 'system_alert',
          title: '📦 New Package Delivery Job',
          message: `Package delivery available: "${item_title}". Deliver to ${delivery_address}. Earn $${driverEarnings.toFixed(2)}. Tap to accept.`,
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
      message: `Your order for "${item_title}" is confirmed. Order #${orderNumber.substring(0, 12)}. The seller has been notified to prepare your package.`,
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
    console.error('dispatchProductOrder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
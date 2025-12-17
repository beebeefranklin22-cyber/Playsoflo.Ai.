import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { order_id, pickup_coords, package_type, franchise_id } = await req.json();

    if (!order_id || !pickup_coords) {
      return Response.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Get all active delivery vehicles
    const vehicles = await base44.asServiceRole.entities.DeliveryVehicle.filter({
      is_active: true
    });

    // Filter vehicles that can handle this package type
    const eligibleVehicles = vehicles.filter(v => 
      v.can_transport && v.can_transport.includes(package_type)
    );

    // Get drivers who are online (have recent activity)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const notifications = [];

    for (const vehicle of eligibleVehicles) {
      // Create notification for eligible drivers
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: vehicle.driver_email,
        type: 'system_alert',
        title: '📦 New Delivery Available',
        message: `A ${package_type} delivery is available near you. Tap to view details.`,
        reference_type: 'delivery',
        reference_id: order_id,
        read: false
      });

      notifications.push(vehicle.driver_email);
    }

    return Response.json({ 
      success: true,
      notified_drivers: notifications.length,
      drivers: notifications
    });

  } catch (error) {
    console.error('Notify drivers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_data, pricing } = await req.json();

    if (!order_data || !pricing) {
      return Response.json({ error: 'Missing order data or pricing' }, { status: 400 });
    }

    // Find nearest franchise
    let franchise = null;
    let estimatedWaitMinutes = 15;

    if (order_data.pickup_coords) {
      try {
        const franchiseResult = await base44.functions.invoke('findNearestFranchise', {
          pickup_coords: order_data.pickup_coords
        });
        
        if (franchiseResult.data?.nearest_franchise) {
          franchise = franchiseResult.data.nearest_franchise;
          estimatedWaitMinutes = franchiseResult.data.estimated_wait_minutes || 15;
        }
      } catch (error) {
        console.log('Could not find franchise, continuing anyway:', error);
      }
    }

    // Verify user has sufficient balance
    if (user.usd_balance < pricing.total_price) {
      return Response.json({ 
        error: 'Insufficient balance',
        required: pricing.total_price,
        available: user.usd_balance
      }, { status: 400 });
    }

    // Generate unique order number
    const orderNumber = `DEL${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Create delivery order
    const delivery = await base44.asServiceRole.entities.DeliveryOrder.create({
      ...order_data,
      order_number: orderNumber,
      ...pricing,
      franchise_id: franchise?.id || null,
      franchise_name: franchise?.franchise_name || 'Default Hub',
      estimated_wait_time_minutes: estimatedWaitMinutes,
      status: 'pending',
      payment_status: 'pending',
      tracking_updates: [{
        timestamp: new Date().toISOString(),
        status: 'pending',
        message: franchise 
          ? `Order assigned to ${franchise.franchise_name}` 
          : 'Delivery order created',
        location: order_data.pickup_address
      }],
      created_by: user.email
    });

    // Deduct from user balance securely
    const newBalance = user.usd_balance - pricing.total_price;
    await base44.asServiceRole.entities.User.update(user.id, {
      usd_balance: newBalance
    });

    // Create payment record
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: pricing.total_price,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'other',
      reference_id: delivery.id,
      sender_email: user.email,
      memo: 'Package delivery payment',
      created_by: user.email
    });

    // Notify sender
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: user.email,
      type: 'system_alert',
      title: '📦 Delivery Created',
      message: `Your delivery #${orderNumber.substring(0, 8)} is being processed by ${franchise?.franchise_name || 'our hub'}. Est. wait: ${estimatedWaitMinutes} min`,
      reference_type: 'delivery',
      reference_id: delivery.id
    });

    // Notify nearby drivers
    try {
      await base44.functions.invoke('notifyNearbyDrivers', {
        order_id: delivery.id,
        pickup_coords: order_data.pickup_coords,
        package_type: order_data.package_type,
        franchise_id: franchise?.id
      });
    } catch (error) {
      console.log('Could not notify drivers:', error);
    }

    return Response.json({ 
      success: true, 
      order_number: orderNumber,
      delivery_id: delivery.id,
      new_balance: newBalance,
      franchise: franchise?.franchise_name,
      estimated_wait_minutes: estimatedWaitMinutes
    });

  } catch (error) {
    console.error('Delivery creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
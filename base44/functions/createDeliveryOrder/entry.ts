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
    const userBalance = parseFloat(user.usd_balance) || 0;
    const totalPrice = parseFloat(pricing.total_price) || 0;
    
    if (userBalance < totalPrice) {
      return Response.json({ 
        error: 'Insufficient balance',
        required: totalPrice.toFixed(2),
        available: userBalance.toFixed(2)
      }, { status: 400 });
    }

    // Generate unique order number
    const orderNumber = `DEL${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Create delivery order with explicit pricing to prevent tampering
    const delivery = await base44.asServiceRole.entities.DeliveryOrder.create({
      sender_name: order_data.sender_name,
      sender_phone: order_data.sender_phone,
      sender_email: order_data.sender_email,
      pickup_address: order_data.pickup_address,
      pickup_coords: order_data.pickup_coords,
      recipient_name: order_data.recipient_name,
      recipient_phone: order_data.recipient_phone,
      recipient_email: order_data.recipient_email,
      delivery_address: order_data.delivery_address,
      delivery_coords: order_data.delivery_coords,
      package_type: order_data.package_type,
      package_weight: order_data.package_weight,
      package_description: order_data.package_description,
      package_value: order_data.package_value,
      delivery_type: order_data.delivery_type,
      urgency_level: order_data.urgency_level,
      special_instructions: order_data.special_instructions,
      signature_required: order_data.signature_required,
      order_number: orderNumber,
      distance_miles: pricing.distance_miles,
      estimated_duration_minutes: pricing.estimated_duration_minutes,
      base_price: pricing.base_price,
      urgency_surcharge: pricing.urgency_surcharge || 0,
      weight_surcharge: pricing.weight_surcharge || 0,
      insurance_fee: pricing.insurance_fee || 0,
      surge_fee: pricing.surge_fee || 0,
      surge_multiplier: pricing.surge_multiplier || 1.0,
      platform_fee: pricing.platform_fee,
      total_price: totalPrice,
      driver_earnings: pricing.driver_earnings,
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

    // Deduct from user balance atomically using service role
    const newBalance = userBalance - totalPrice;
    await base44.asServiceRole.entities.User.update(user.id, {
      usd_balance: newBalance
    });

    // Create payment record - use service role to ensure creation
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: totalPrice,
      amount_rri: 0,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'other',
      reference_id: delivery.id,
      sender_email: user.email,
      recipient_email: 'platform@playsoflo.com',
      memo: `Delivery payment #${orderNumber.substring(0, 8)}`
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
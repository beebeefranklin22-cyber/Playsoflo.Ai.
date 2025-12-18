import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deliveryData } = await req.json();

    if (!deliveryData) {
      return Response.json({ error: 'Missing delivery data' }, { status: 400 });
    }

    // Calculate delivery pricing
    const { data: pricingData } = await base44.functions.invoke('calculateDeliveryPrice', {
      pickup_coords: deliveryData.pickup_coords,
      delivery_coords: deliveryData.delivery_coords,
      package_type: deliveryData.package_type,
      urgency_level: deliveryData.urgency_level || 'normal',
      package_weight: deliveryData.package_weight || 1
    });

    // Check balance
    if (user.usd_balance < pricingData.total_price) {
      return Response.json({ 
        error: 'Insufficient balance',
        required: pricingData.total_price,
        current: user.usd_balance
      }, { status: 400 });
    }

    // Deduct from user balance
    await base44.asServiceRole.entities.User.update(user.id, {
      usd_balance: user.usd_balance - pricingData.total_price
    });

    // Create delivery order
    const order = await base44.asServiceRole.entities.DeliveryOrder.create({
      ...deliveryData,
      order_number: `DEL${Date.now().toString(36).toUpperCase()}`,
      ...pricingData,
      status: 'pending',
      payment_status: 'paid'
    });

    // Create payment record
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: pricingData.total_price,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'delivery',
      reference_id: order.id,
      sender_email: user.email,
      memo: `Delivery: ${deliveryData.package_description || 'Package'}`
    });

    // Notify nearby drivers
    await base44.asServiceRole.functions.invoke('notifyNearbyDrivers', {
      order_id: order.id,
      pickup_coords: deliveryData.pickup_coords
    });

    return Response.json({
      success: true,
      order,
      message: 'Delivery booked successfully'
    });

  } catch (error) {
    console.error('Delivery booking error:', error);
    return Response.json({ 
      error: 'Delivery booking failed',
      details: error.message 
    }, { status: 500 });
  }
});
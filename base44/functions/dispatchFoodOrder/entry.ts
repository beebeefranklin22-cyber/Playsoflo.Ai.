import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * dispatchFoodOrder
 * Called after successful payment on a FoodOrder.
 * 1. Marks FoodOrder as confirmed with full restaurant details
 * 2. Creates a DeliveryOrder with correct pickup/delivery addresses and instructions
 * 3. Notifies the restaurant owner
 * 4. Broadcasts to available food delivery drivers
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { food_order_id, payment_intent_id } = await req.json();

    if (!food_order_id) {
      return Response.json({ error: 'food_order_id is required' }, { status: 400 });
    }

    // Fetch the food order
    const foodOrders = await base44.asServiceRole.entities.FoodOrder.filter({ id: food_order_id });
    if (foodOrders.length === 0) {
      return Response.json({ error: 'Food order not found' }, { status: 404 });
    }
    const foodOrder = foodOrders[0];

    // Fetch the restaurant for full details
    const restaurants = await base44.asServiceRole.entities.Restaurant.filter({ id: foodOrder.restaurant_id });
    if (restaurants.length === 0) {
      return Response.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    const restaurant = restaurants[0];

    // Determine restaurant owner email (created_by on Restaurant entity)
    const restaurantOwnerEmail = restaurant.owner_email || restaurant.created_by;
    const restaurantAddress = restaurant.address || restaurant.name;
    const restaurantPhone = restaurant.phone || 'N/A';

    // Build item summary
    const itemSummary = (foodOrder.items || [])
      .map(i => `${i.quantity}x ${i.name}`)
      .join(', ');

    const orderNumber = `FOOD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const total = parseFloat(foodOrder.total) || 0;
    const deliveryFee = parseFloat(foodOrder.delivery_fee) || 3.99;
    const platformFee = parseFloat((total * 0.10).toFixed(2));
    const driverEarnings = parseFloat((deliveryFee * 0.80).toFixed(2));

    // Update FoodOrder with restaurant details, payment info, and confirmed status
    await base44.asServiceRole.entities.FoodOrder.update(food_order_id, {
      status: 'confirmed',
      restaurant_owner_email: restaurantOwnerEmail,
      restaurant_address: restaurantAddress,
      restaurant_phone: restaurantPhone,
      driver_earnings: driverEarnings,
      ...(payment_intent_id ? { payment_intent_id } : {})
    });

    // Create a linked DeliveryOrder for the driver system
    const deliveryOrder = await base44.asServiceRole.entities.DeliveryOrder.create({
      order_number: orderNumber,
      sender_name: restaurant.name,
      sender_phone: restaurantPhone,
      sender_email: restaurantOwnerEmail,
      pickup_address: restaurantAddress,
      recipient_name: user.full_name || user.email.split('@')[0],
      recipient_phone: user.phone || 'N/A',
      recipient_email: user.email,
      delivery_address: foodOrder.delivery_address,
      package_type: 'food',
      package_description: itemSummary,
      delivery_type: 'same_day',
      urgency_level: 'urgent',
      base_price: total,
      platform_fee: platformFee,
      driver_earnings: driverEarnings,
      total_price: total,
      status: 'pending',
      payment_status: 'paid',
      payment_method: 'stripe',
      special_instructions: foodOrder.special_instructions || '',
      food_order_id: food_order_id,
      tracking_updates: [{
        timestamp: new Date().toISOString(),
        status: 'pending',
        message: 'Order confirmed, finding a driver',
        location: foodOrder.delivery_address
      }]
    });

    // Link the delivery order back to the food order
    await base44.asServiceRole.entities.FoodOrder.update(food_order_id, {
      delivery_order_id: deliveryOrder.id
    });

    // Notify restaurant owner
    if (restaurantOwnerEmail) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: restaurantOwnerEmail,
        type: 'order_update',
        title: '📱 New Order Received!',
        message: `New order from ${user.full_name || user.email}: ${itemSummary}. Deliver to: ${foodOrder.delivery_address}. Total: $${total.toFixed(2)}. Order #${orderNumber.substring(0, 10)}.`,
        reference_type: 'order',
        reference_id: food_order_id,
        read: false
      });
    }

    // Notify available food delivery drivers
    let notifiedDrivers = 0;
    try {
      // Look for active DeliveryVehicle drivers who can handle food
      const vehicles = await base44.asServiceRole.entities.DeliveryVehicle.filter({ is_active: true });
      const foodDriverVehicles = vehicles.filter(v =>
        !v.can_transport || v.can_transport.includes('food') || v.can_transport.includes('small_box')
      );

      const driverEmailsSeen = new Set();

      for (const vehicle of foodDriverVehicles) {
        if (!driverEmailsSeen.has(vehicle.driver_email)) {
          driverEmailsSeen.add(vehicle.driver_email);
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: vehicle.driver_email,
            type: 'order_update',
            title: '🍕 New Food Delivery Available!',
            message: `Pickup: ${restaurantAddress} → Deliver to: ${foodOrder.delivery_address}. Items: ${itemSummary}. Earn $${driverEarnings.toFixed(2)}. Tap to accept.`,
            reference_type: 'order',
            reference_id: food_order_id,
            read: false
          });
          notifiedDrivers++;
        }
      }

      // Also notify users with food_driver role
      const foodDriverUsers = await base44.asServiceRole.entities.User.filter({ role: 'food_driver' });
      for (const driver of foodDriverUsers) {
        if (!driverEmailsSeen.has(driver.email)) {
          driverEmailsSeen.add(driver.email);
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: driver.email,
            type: 'order_update',
            title: '🍕 New Food Delivery Available!',
            message: `Pickup: ${restaurantAddress} → Deliver to: ${foodOrder.delivery_address}. Items: ${itemSummary}. Earn $${driverEarnings.toFixed(2)}. Tap to accept.`,
            reference_type: 'order',
            reference_id: food_order_id,
            read: false
          });
          notifiedDrivers++;
        }
      }
    } catch (err) {
      console.log('Driver notification error (non-fatal):', err.message);
    }

    // Confirm to customer
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: user.email,
      type: 'order_update',
      title: '✅ Order Confirmed!',
      message: `Your order from ${restaurant.name} is confirmed! Items: ${itemSummary}. We'll notify you when a driver is assigned.`,
      reference_type: 'order',
      reference_id: food_order_id,
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
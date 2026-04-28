import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.4.0';

/**
 * processUnifiedCheckout
 * ─────────────────────────────────────────────────────────────────────────
 * Unified checkout for ALL purchase types.
 *
 * Money flow:
 *   Customer pays:
 *     - item subtotal
 *     - platform fee (% of subtotal)
 *     - [local_delivery only] vendor delivery base fee + $/mile distance fee
 *
 *   Vendor earns:
 *     - subtotal − platform fee  (item earnings, paid immediately)
 *     - vendor delivery base fee is NOT added to vendor earnings — it funds driver pay
 *
 *   Driver earns (on delivery completion via settleDeliveryPayment):
 *     - 85% of (vendor_delivery_fee + distance_fee)
 *     - Platform keeps 15% of delivery fee pool
 *
 * Platform fee rates (applied to item subtotal only):
 *   service_booking: 15%, product_order: 15%, digital_product: 20%,
 *   subscription: 20%, experience: 19%, food_order: 10%
 */

const PLATFORM_FEE_RATES = {
  service_booking: 0.15,
  product_order: 0.15,
  digital_product: 0.20,
  subscription: 0.20,
  experience: 0.19,
  food_order: 0.10,
};

const DRIVER_EARNINGS_RATE = 0.85;
const PRICE_PER_MILE = 1.25; // $/mile charged to customer for local delivery

// Haversine distance in miles
function haversineDistance(coords1, coords2) {
  const R = 3959;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(coords2[0] - coords1[0]);
  const dLon = toRad(coords2[1] - coords1[1]);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coords1[0])) * Math.cos(toRad(coords2[0])) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocode an address string to [lat, lng] using Google Maps API
async function geocodeAddress(address) {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'OK' && data.results.length > 0) {
    const loc = data.results[0].geometry.location;
    return [loc.lat, loc.lng];
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      order_type,
      payment_method,
      amount,              // item subtotal (before delivery fees)
      provider_email,
      provider_name,
      item_id,
      item_title,
      item_description,
      booking_date,
      booking_time,
      customer_notes,
      customer_phone,
      fulfillment_method,
      delivery_address,
      shipping_address,
      quantity,
      variants,
      subscription_interval,
      confirm_payment_intent_id,
      cart_items,
      // Optional: franchise info (if ordering from a franchise vendor)
      franchise_id,
      franchise_address,
      franchise_coords,    // [lat, lng] of the franchise/provider location
      customer_coords,     // [lat, lng] of the customer (if known from browser geolocation)
    } = body;

    if (!order_type || !payment_method || !amount || !provider_email) {
      return Response.json({ error: 'Missing required fields: order_type, payment_method, amount, provider_email' }, { status: 400 });
    }

    const itemSubtotal = parseFloat(amount);
    if (isNaN(itemSubtotal) || itemSubtotal <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const platformFeeRate = PLATFORM_FEE_RATES[order_type] || 0.15;
    const platformFee = parseFloat((itemSubtotal * platformFeeRate).toFixed(2));
    // Vendor earns item subtotal minus platform fee
    const providerEarnings = parseFloat((itemSubtotal - platformFee).toFixed(2));

    // ── Delivery fee calculation ───────────────────────────────────────────
    let deliveryFeeBase = 0;     // vendor-set base delivery fee
    let deliveryDistanceFee = 0; // distance-based $/mile fee
    let deliveryDistanceMiles = 0;
    let driverEarnings = 0;
    let deliveryPlatformFee = 0;

    const isLocalDelivery = fulfillment_method === 'local_delivery' || order_type === 'food_order';

    if (isLocalDelivery) {
      // Get vendor's store settings for their delivery base fee
      const storeSettingsList = await base44.asServiceRole.entities.StoreSettings.filter({ owner_email: provider_email });
      const storeSettings = storeSettingsList[0];
      deliveryFeeBase = parseFloat(storeSettings?.fulfillment_options?.local_delivery_fee || 3.99);

      // Calculate distance fee using coordinates
      const delivAddr = delivery_address || shipping_address;
      let pickupCoords = franchise_coords || null;
      let dropoffCoords = customer_coords || null;

      // Geocode provider address if we don't have coords
      if (!pickupCoords && (franchise_address || storeSettings?.store_address)) {
        pickupCoords = await geocodeAddress(franchise_address || storeSettings.store_address);
      }

      // Geocode customer address if we don't have coords
      if (!dropoffCoords && delivAddr) {
        dropoffCoords = await geocodeAddress(delivAddr);
      }

      if (pickupCoords && dropoffCoords) {
        deliveryDistanceMiles = parseFloat(haversineDistance(pickupCoords, dropoffCoords).toFixed(2));
        deliveryDistanceFee = parseFloat((deliveryDistanceMiles * PRICE_PER_MILE).toFixed(2));
      } else {
        // Fallback: flat distance fee if geocoding not available
        deliveryDistanceFee = 2.50;
        deliveryDistanceMiles = 2.0;
      }

      const totalDeliveryPool = parseFloat((deliveryFeeBase + deliveryDistanceFee).toFixed(2));
      driverEarnings = parseFloat((totalDeliveryPool * DRIVER_EARNINGS_RATE).toFixed(2));
      deliveryPlatformFee = parseFloat((totalDeliveryPool - driverEarnings).toFixed(2));
    }

    const totalDeliveryFee = parseFloat((deliveryFeeBase + deliveryDistanceFee).toFixed(2));
    // Total customer pays = item subtotal + platform fee on items + delivery fees
    const totalAmount = parseFloat((itemSubtotal + platformFee + totalDeliveryFee).toFixed(2));

    // ── WALLET PAYMENT ──────────────────────────────────────────────────────
    if (payment_method === 'wallet') {
      const customerBalance = parseFloat(user.usd_balance || 0);
      if (customerBalance < totalAmount) {
        return Response.json({
          error: `Insufficient wallet balance. You have $${customerBalance.toFixed(2)}, need $${totalAmount.toFixed(2)}.`
        }, { status: 400 });
      }

      const newBalance = parseFloat((customerBalance - totalAmount).toFixed(2));
      await base44.asServiceRole.entities.User.update(user.id, { usd_balance: newBalance });

      const orderRecord = await createOrderRecord(base44, {
        order_type, user, provider_email, provider_name,
        item_id, item_title, item_description,
        itemSubtotal, platformFee, providerEarnings,
        totalDeliveryFee, deliveryFeeBase, deliveryDistanceFee, deliveryDistanceMiles,
        totalAmount,
        payment_method: 'wallet', payment_status: 'paid',
        booking_date, booking_time, customer_notes, customer_phone,
        fulfillment_method, delivery_address, shipping_address,
        quantity, variants, subscription_interval, cart_items,
        franchise_id, franchise_address,
      });

      // Credit vendor for item earnings immediately
      await settleProviderEarnings(base44, {
        order_type, order_id: orderRecord.id, provider_email, providerEarnings, platformFee, itemSubtotal
      });

      // Dispatch driver for delivery (driver paid on completion via settleDeliveryPayment)
      let deliveryOrderId = null;
      if (isLocalDelivery) {
        deliveryOrderId = await dispatchDriver(base44, {
          order_id: orderRecord.id, user, provider_email, provider_name,
          item_title, delivery_address: delivery_address || shipping_address,
          deliveryFeeBase, deliveryDistanceFee, deliveryDistanceMiles,
          driverEarnings, deliveryPlatformFee, order_type,
          franchise_id, franchise_address,
        });
      }

      await sendAllNotifications(base44, {
        order_type, user, provider_email, provider_name,
        item_title, itemSubtotal, totalAmount, platformFee, providerEarnings,
        totalDeliveryFee, order_id: orderRecord.id,
        booking_date, booking_time, fulfillment_method, delivery_order_id: deliveryOrderId,
        payment_method: 'wallet'
      });

      return Response.json({
        success: true,
        payment_method: 'wallet',
        order_id: orderRecord.id,
        delivery_order_id: deliveryOrderId,
        item_subtotal: itemSubtotal,
        platform_fee: platformFee,
        delivery_fee_base: deliveryFeeBase,
        delivery_distance_fee: deliveryDistanceFee,
        delivery_distance_miles: deliveryDistanceMiles,
        total_delivery_fee: totalDeliveryFee,
        total_amount: totalAmount,
        provider_earnings: providerEarnings,
        driver_earnings: driverEarnings,
        customer_new_balance: newBalance,
      });
    }

    // ── STRIPE PAYMENT ──────────────────────────────────────────────────────
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    const stripe = new Stripe(stripeKey);

    // Confirming an existing payment intent
    if (confirm_payment_intent_id) {
      const intent = await stripe.paymentIntents.retrieve(confirm_payment_intent_id);
      if (intent.status !== 'succeeded' && intent.status !== 'processing') {
        return Response.json({ error: 'Payment not completed' }, { status: 400 });
      }

      const orderRecord = await createOrderRecord(base44, {
        order_type, user, provider_email, provider_name,
        item_id, item_title, item_description,
        itemSubtotal, platformFee, providerEarnings,
        totalDeliveryFee, deliveryFeeBase, deliveryDistanceFee, deliveryDistanceMiles,
        totalAmount,
        payment_method: 'stripe', payment_status: 'paid',
        stripe_payment_intent_id: confirm_payment_intent_id,
        booking_date, booking_time, customer_notes, customer_phone,
        fulfillment_method, delivery_address, shipping_address,
        quantity, variants, subscription_interval, cart_items,
        franchise_id, franchise_address,
      });

      await settleProviderEarnings(base44, {
        order_type, order_id: orderRecord.id, provider_email, providerEarnings, platformFee, itemSubtotal
      });

      let deliveryOrderId = null;
      if (isLocalDelivery) {
        deliveryOrderId = await dispatchDriver(base44, {
          order_id: orderRecord.id, user, provider_email, provider_name,
          item_title, delivery_address: delivery_address || shipping_address,
          deliveryFeeBase, deliveryDistanceFee, deliveryDistanceMiles,
          driverEarnings, deliveryPlatformFee, order_type,
          franchise_id, franchise_address,
        });
      }

      await sendAllNotifications(base44, {
        order_type, user, provider_email, provider_name,
        item_title, itemSubtotal, totalAmount, platformFee, providerEarnings,
        totalDeliveryFee, order_id: orderRecord.id,
        booking_date, booking_time, fulfillment_method, delivery_order_id: deliveryOrderId,
        payment_method: 'stripe'
      });

      return Response.json({
        success: true,
        payment_method: 'stripe',
        order_id: orderRecord.id,
        delivery_order_id: deliveryOrderId,
        item_subtotal: itemSubtotal,
        platform_fee: platformFee,
        total_delivery_fee: totalDeliveryFee,
        delivery_distance_miles: deliveryDistanceMiles,
        total_amount: totalAmount,
        provider_earnings: providerEarnings,
        driver_earnings: driverEarnings,
      });
    }

    // Create Stripe PaymentIntent for frontend to confirm
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_email: user.email,
        user_id: user.id,
        order_type,
        provider_email,
        item_id: item_id || '',
        item_title: item_title || '',
        item_subtotal: itemSubtotal.toString(),
        platform_fee: platformFee.toString(),
        provider_earnings: providerEarnings.toString(),
        delivery_fee_base: deliveryFeeBase.toString(),
        delivery_distance_fee: deliveryDistanceFee.toString(),
        delivery_distance_miles: deliveryDistanceMiles.toString(),
        total_delivery_fee: totalDeliveryFee.toString(),
        driver_earnings: driverEarnings.toString(),
      },
      description: `${order_type.replace(/_/g, ' ')} — ${item_title || 'Order'} from ${provider_name || provider_email}`,
    });

    return Response.json({
      success: true,
      requires_payment: true,
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      publishable_key: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
      item_subtotal: itemSubtotal,
      platform_fee: platformFee,
      delivery_fee_base: deliveryFeeBase,
      delivery_distance_fee: deliveryDistanceFee,
      delivery_distance_miles: deliveryDistanceMiles,
      total_delivery_fee: totalDeliveryFee,
      total_amount: totalAmount,
      provider_earnings: providerEarnings,
      driver_earnings: driverEarnings,
    });

  } catch (error) {
    console.error('processUnifiedCheckout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Create entity record ──────────────────────────────────────────────────────
async function createOrderRecord(base44, opts) {
  const {
    order_type, user, provider_email, provider_name, item_id, item_title, item_description,
    itemSubtotal, platformFee, providerEarnings, totalDeliveryFee, deliveryFeeBase,
    deliveryDistanceFee, deliveryDistanceMiles, totalAmount,
    payment_method, payment_status, stripe_payment_intent_id,
    booking_date, booking_time, customer_notes, customer_phone,
    fulfillment_method, delivery_address, shipping_address, quantity, variants,
    subscription_interval, cart_items, franchise_id, franchise_address,
  } = opts;

  const now = new Date().toISOString();

  if (order_type === 'service_booking') {
    return await base44.asServiceRole.entities.ServiceBooking.create({
      customer_email: user.email,
      customer_name: user.full_name,
      provider_email,
      provider_name: provider_name || provider_email,
      service_id: item_id,
      service_title: item_title,
      service_name: item_title,
      booking_date,
      booking_time,
      notes: customer_notes,
      customer_phone: customer_phone || user.phone || '',
      total_price: totalAmount,
      platform_fee: platformFee,
      provider_earnings: providerEarnings,
      status: 'confirmed',
      booking_status: 'confirmed',
      payment_status: 'paid',
      payment_method,
      payment_intent_id: stripe_payment_intent_id || '',
      paid_at: now,
    });
  }

  if (order_type === 'experience') {
    return await base44.asServiceRole.entities.Booking.create({
      customer_email: user.email,
      customer_name: user.full_name,
      provider_email,
      listing_id: item_id,
      listing_title: item_title,
      booking_date,
      booking_time: booking_time || '00:00',
      total_amount: totalAmount,
      status: 'confirmed',
      payment_status: 'paid',
      payment_method,
      notes: customer_notes,
    });
  }

  if (order_type === 'subscription') {
    return await base44.asServiceRole.entities.UserSubscription.create({
      user_email: user.email,
      provider_email,
      plan_name: item_title,
      plan_id: item_id,
      amount: totalAmount,
      interval: subscription_interval || 'monthly',
      status: 'active',
      payment_method,
      started_at: now,
      next_billing_date: getNextBillingDate(subscription_interval),
      platform_fee: platformFee,
      provider_earnings: providerEarnings,
    });
  }

  if (order_type === 'food_order') {
    return await base44.asServiceRole.entities.FoodOrder.create({
      customer_email: user.email,
      customer_name: user.full_name,
      provider_email,
      restaurant_name: provider_name || provider_email,
      items: cart_items || [],
      subtotal: itemSubtotal,
      total_amount: totalAmount,
      platform_fee: platformFee,
      provider_earnings: providerEarnings,
      delivery_fee: totalDeliveryFee,
      delivery_distance_miles: deliveryDistanceMiles,
      fulfillment_method: fulfillment_method || 'local_delivery',
      delivery_address: delivery_address || shipping_address || '',
      franchise_id: franchise_id || '',
      franchise_address: franchise_address || '',
      status: 'confirmed',
      payment_status: 'paid',
      payment_method,
      notes: customer_notes,
      placed_at: now,
    });
  }

  // product_order and digital_product
  return await base44.asServiceRole.entities.Order.create({
    order_type,
    user_email: user.email,
    product_id: item_id,
    product_name: item_title,
    quantity: quantity || 1,
    item_price: itemSubtotal / (quantity || 1),
    subtotal: itemSubtotal,
    platform_fee: platformFee,
    shipping_cost: totalDeliveryFee,
    total_amount: totalAmount,
    provider_email,
    fulfillment_method: fulfillment_method || 'shipping',
    shipping_address: JSON.stringify(shipping_address || delivery_address || {}),
    status: 'confirmed',
    payment_method,
    stripe_session_id: stripe_payment_intent_id || '',
    customer_notes: customer_notes || '',
    franchise_id: franchise_id || '',
  });
}

// ── Settle vendor/provider earnings immediately ───────────────────────────────
async function settleProviderEarnings(base44, opts) {
  const { order_type, order_id, provider_email, providerEarnings, platformFee, itemSubtotal } = opts;

  const providers = await base44.asServiceRole.entities.User.filter({ email: provider_email });
  if (providers.length === 0) return;

  const provider = providers[0];
  const currentBalance = parseFloat(provider.usd_balance || 0);
  const newBalance = parseFloat((currentBalance + providerEarnings).toFixed(2));
  const totalServiceEarnings = parseFloat(((provider.total_service_earnings || 0) + providerEarnings).toFixed(2));

  await base44.asServiceRole.entities.User.update(provider.id, {
    usd_balance: newBalance,
    total_service_earnings: totalServiceEarnings,
  });

  // Ledger: vendor payout
  await base44.asServiceRole.entities.Payment.create({
    amount_usd: providerEarnings,
    method: 'internal_transfer',
    status: 'completed',
    reference_type: 'booking',
    reference_id: order_id,
    recipient_email: provider_email,
    sender_email: 'platform@playsoflo.com',
    memo: `Vendor earnings — ${order_type.replace(/_/g, ' ')} (after ${Math.round((platformFee / itemSubtotal) * 100)}% platform fee)`,
  });

  // Ledger: platform fee
  if (platformFee > 0) {
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: platformFee,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'platform_fee',
      reference_id: order_id,
      sender_email: provider_email,
      recipient_email: 'platform@playsoflo.com',
      memo: `Platform fee — ${order_type.replace(/_/g, ' ')} (${Math.round((platformFee / itemSubtotal) * 100)}%)`,
    });
  }
}

// ── Dispatch a delivery driver (driver paid on completion) ────────────────────
async function dispatchDriver(base44, opts) {
  const {
    order_id, user, provider_email, provider_name, item_title, delivery_address,
    deliveryFeeBase, deliveryDistanceFee, deliveryDistanceMiles,
    driverEarnings, deliveryPlatformFee, order_type,
    franchise_id, franchise_address,
  } = opts;

  const orderNumber = `DLV${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  const totalDeliveryPool = parseFloat((deliveryFeeBase + deliveryDistanceFee).toFixed(2));

  const deliveryOrder = await base44.asServiceRole.entities.DeliveryOrder.create({
    order_number: orderNumber,
    sender_name: provider_name || 'Provider',
    sender_phone: 'N/A',
    sender_email: provider_email,
    pickup_address: franchise_address || `Provider: ${provider_email}`,
    recipient_name: user.full_name || user.email,
    recipient_phone: user.phone || 'N/A',
    recipient_email: user.email,
    delivery_address: delivery_address || 'Address on file',
    package_type: order_type === 'food_order' ? 'food' : 'small_box',
    package_description: item_title,
    delivery_type: order_type === 'food_order' ? 'same_day' : 'standard',
    urgency_level: order_type === 'food_order' ? 'urgent' : 'normal',
    distance_miles: deliveryDistanceMiles,
    // base_price = full delivery pool (vendor fee + distance fee) — driver earns 85% of this on completion
    base_price: totalDeliveryPool,
    driver_earnings: driverEarnings,   // stored, credited on delivery completion
    platform_fee: deliveryPlatformFee,
    total_price: totalDeliveryPool,
    status: 'pending',
    payment_status: 'paid', // already collected from customer at checkout
    franchise_id: franchise_id || '',
    tracking_updates: [{
      timestamp: new Date().toISOString(),
      status: 'pending',
      message: 'Order placed, looking for available driver',
      location: franchise_address || delivery_address || '',
    }],
    special_instructions: `Linked to order #${order_id}. Distance: ${deliveryDistanceMiles} miles. Driver earns $${driverEarnings.toFixed(2)} on completion.`,
  });

  // Notify available drivers
  try {
    const vehicles = await base44.asServiceRole.entities.DeliveryVehicle.filter({ is_active: true });
    for (const v of vehicles.slice(0, 10)) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: v.driver_email,
        type: 'system_alert',
        title: order_type === 'food_order' ? '🍔 Food Delivery Available!' : '📦 Delivery Job Available!',
        message: `Deliver "${item_title}" to ${delivery_address} (${deliveryDistanceMiles} mi). Earn $${driverEarnings.toFixed(2)}. Tap to accept.`,
        reference_type: 'delivery',
        reference_id: deliveryOrder.id,
        read: false,
      });
    }
  } catch (err) {
    console.log('Driver notification error (non-fatal):', err.message);
  }

  return deliveryOrder.id;
}

// ── Notifications ─────────────────────────────────────────────────────────────
async function sendAllNotifications(base44, opts) {
  const {
    order_type, user, provider_email, provider_name, item_title,
    itemSubtotal, totalAmount, platformFee, providerEarnings, totalDeliveryFee,
    order_id, booking_date, booking_time, fulfillment_method,
    delivery_order_id, payment_method
  } = opts;

  const typeLabels = {
    service_booking: 'Service Booking', product_order: 'Order',
    digital_product: 'Digital Purchase', subscription: 'Subscription',
    experience: 'Experience Booking', food_order: 'Food Order',
  };
  const label = typeLabels[order_type] || 'Order';
  const payLabel = payment_method === 'wallet' ? 'SoFlo Wallet' : 'Card';

  // Customer
  await base44.asServiceRole.entities.Notification.create({
    recipient_email: user.email,
    type: 'system_alert',
    title: `✅ ${label} Confirmed!`,
    message: booking_date
      ? `Your booking for "${item_title}" on ${booking_date} at ${booking_time} is confirmed. Total: $${totalAmount.toFixed(2)} via ${payLabel}.`
      : `Your ${label.toLowerCase()} for "${item_title}" is confirmed! Total: $${totalAmount.toFixed(2)} via ${payLabel}${totalDeliveryFee > 0 ? ` (includes $${totalDeliveryFee.toFixed(2)} delivery)` : ''}.`,
    reference_type: 'booking',
    reference_id: order_id,
    read: false,
  });

  // Provider — show their earnings clearly
  await base44.asServiceRole.entities.Notification.create({
    recipient_email: provider_email,
    type: 'system_alert',
    title: `🛎️ New ${label}!`,
    message: booking_date
      ? `${user.full_name || user.email} booked "${item_title}" on ${booking_date} at ${booking_time}. You earned $${providerEarnings.toFixed(2)} (after platform fee) — credited to your wallet.`
      : `${user.full_name || user.email} ordered "${item_title}". You earned $${providerEarnings.toFixed(2)} (after platform fee) — credited to your wallet.`,
    reference_type: 'booking',
    reference_id: order_id,
    read: false,
  });

  // Driver dispatch notice to customer
  if (delivery_order_id) {
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: user.email,
      type: 'system_alert',
      title: '🚗 Driver Being Dispatched',
      message: `A driver is being assigned to your order. Delivery fee: $${totalDeliveryFee.toFixed(2)}. You'll get tracking updates!`,
      reference_type: 'delivery',
      reference_id: delivery_order_id,
      read: false,
    });
  }
}

function getNextBillingDate(interval) {
  const d = new Date();
  if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
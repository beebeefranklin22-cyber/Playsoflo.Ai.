import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.4.0';

/**
 * processUnifiedCheckout
 * ─────────────────────────────────────────────────────────────────────────
 * Unified checkout for ALL purchase types:
 *   - service_booking   (appointment with a provider)
 *   - product_order     (physical product - dispatches driver if local_delivery)
 *   - digital_product   (instant access)
 *   - subscription      (recurring billing via Stripe or wallet)
 *   - experience        (event / experience booking)
 *   - food_order        (restaurant order)
 *
 * Payment methods:
 *   - stripe            (Stripe PaymentIntent flow)
 *   - wallet            (SoFlo wallet balance)
 *
 * Platform fees (deducted before provider settlement):
 *   - service_booking:  15%
 *   - product_order:    15%
 *   - digital_product:  20%
 *   - subscription:     20%
 *   - experience:       19%
 *   - food_order:       10%
 *
 * Driver dispatch: triggered automatically when fulfillment_method = local_delivery
 */

const PLATFORM_FEE_RATES = {
  service_booking: 0.15,
  product_order: 0.15,
  digital_product: 0.20,
  subscription: 0.20,
  experience: 0.19,
  food_order: 0.10,
};

const DRIVER_EARNINGS_RATE = 0.85; // driver gets 85% of delivery fee

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      order_type,          // service_booking | product_order | digital_product | subscription | experience | food_order
      payment_method,      // stripe | wallet
      amount,              // total amount customer pays
      provider_email,
      provider_name,
      item_id,             // product/service/experience id
      item_title,
      item_description,
      // For service bookings
      booking_date,
      booking_time,
      customer_notes,
      customer_phone,
      // For product orders
      fulfillment_method,  // pickup | shipping | local_delivery
      delivery_address,
      shipping_address,
      quantity,
      variants,
      // For subscriptions
      subscription_interval, // monthly | yearly
      // For Stripe payment_intent confirmation
      confirm_payment_intent_id,
      // Cart items (for food/multi-item)
      cart_items,
    } = body;

    if (!order_type || !payment_method || !amount || !provider_email) {
      return Response.json({ error: 'Missing required fields: order_type, payment_method, amount, provider_email' }, { status: 400 });
    }

    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const platformFeeRate = PLATFORM_FEE_RATES[order_type] || 0.15;
    const platformFee = parseFloat((totalAmount * platformFeeRate).toFixed(2));
    const providerEarnings = parseFloat((totalAmount - platformFee).toFixed(2));

    // ── WALLET PAYMENT ──────────────────────────────────────────────────────
    if (payment_method === 'wallet') {
      const customerBalance = parseFloat(user.usd_balance || 0);
      if (customerBalance < totalAmount) {
        return Response.json({
          error: `Insufficient wallet balance. You have $${customerBalance.toFixed(2)}, need $${totalAmount.toFixed(2)}.`
        }, { status: 400 });
      }

      // Deduct from customer
      const newBalance = parseFloat((customerBalance - totalAmount).toFixed(2));
      await base44.asServiceRole.entities.User.update(user.id, { usd_balance: newBalance });

      // Create the order record
      const orderRecord = await createOrderRecord(base44, {
        order_type, user, provider_email, provider_name,
        item_id, item_title, item_description,
        totalAmount, platformFee, providerEarnings,
        payment_method: 'wallet', payment_status: 'paid',
        booking_date, booking_time, customer_notes, customer_phone,
        fulfillment_method, delivery_address, shipping_address,
        quantity, variants, subscription_interval, cart_items,
      });

      // Settle provider earnings
      await settleProviderEarnings(base44, {
        order_type, order_id: orderRecord.id, provider_email, providerEarnings, platformFee, totalAmount
      });

      // Dispatch driver if local delivery
      let deliveryOrderId = null;
      if (fulfillment_method === 'local_delivery' || order_type === 'food_order') {
        deliveryOrderId = await dispatchDriver(base44, {
          order_id: orderRecord.id, user, provider_email, provider_name,
          item_title, delivery_address: delivery_address || shipping_address,
          totalAmount, platformFee, order_type
        });
      }

      // Notify everyone
      await sendAllNotifications(base44, {
        order_type, user, provider_email, provider_name,
        item_title, totalAmount, order_id: orderRecord.id,
        booking_date, booking_time, fulfillment_method, delivery_order_id: deliveryOrderId,
        payment_method: 'wallet'
      });

      return Response.json({
        success: true,
        payment_method: 'wallet',
        order_id: orderRecord.id,
        delivery_order_id: deliveryOrderId,
        amount: totalAmount,
        platform_fee: platformFee,
        provider_earnings: providerEarnings,
        customer_new_balance: newBalance,
      });
    }

    // ── STRIPE PAYMENT ──────────────────────────────────────────────────────
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    const stripe = new Stripe(stripeKey);

    // If confirming an existing payment intent (after Stripe confirms on frontend)
    if (confirm_payment_intent_id) {
      const intent = await stripe.paymentIntents.retrieve(confirm_payment_intent_id);
      if (intent.status !== 'succeeded' && intent.status !== 'processing') {
        return Response.json({ error: 'Payment not completed' }, { status: 400 });
      }

      const orderRecord = await createOrderRecord(base44, {
        order_type, user, provider_email, provider_name,
        item_id, item_title, item_description,
        totalAmount, platformFee, providerEarnings,
        payment_method: 'stripe', payment_status: 'paid',
        stripe_payment_intent_id: confirm_payment_intent_id,
        booking_date, booking_time, customer_notes, customer_phone,
        fulfillment_method, delivery_address, shipping_address,
        quantity, variants, subscription_interval, cart_items,
      });

      await settleProviderEarnings(base44, {
        order_type, order_id: orderRecord.id, provider_email, providerEarnings, platformFee, totalAmount
      });

      let deliveryOrderId = null;
      if (fulfillment_method === 'local_delivery' || order_type === 'food_order') {
        deliveryOrderId = await dispatchDriver(base44, {
          order_id: orderRecord.id, user, provider_email, provider_name,
          item_title, delivery_address: delivery_address || shipping_address,
          totalAmount, platformFee, order_type
        });
      }

      await sendAllNotifications(base44, {
        order_type, user, provider_email, provider_name,
        item_title, totalAmount, order_id: orderRecord.id,
        booking_date, booking_time, fulfillment_method, delivery_order_id: deliveryOrderId,
        payment_method: 'stripe'
      });

      return Response.json({
        success: true,
        payment_method: 'stripe',
        order_id: orderRecord.id,
        delivery_order_id: deliveryOrderId,
        amount: totalAmount,
        platform_fee: platformFee,
        provider_earnings: providerEarnings,
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
        platform_fee: platformFee.toString(),
        provider_earnings: providerEarnings.toString(),
      },
      description: `${order_type.replace(/_/g, ' ')} — ${item_title || 'Order'} from ${provider_name || provider_email}`,
    });

    const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');

    return Response.json({
      success: true,
      requires_payment: true,
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      publishable_key: publishableKey,
      amount: totalAmount,
      platform_fee: platformFee,
      provider_earnings: providerEarnings,
    });

  } catch (error) {
    console.error('processUnifiedCheckout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Create the correct entity record based on order_type ─────────────────────
async function createOrderRecord(base44, opts) {
  const {
    order_type, user, provider_email, provider_name, item_id, item_title, item_description,
    totalAmount, platformFee, providerEarnings, payment_method, payment_status,
    stripe_payment_intent_id, booking_date, booking_time, customer_notes, customer_phone,
    fulfillment_method, delivery_address, shipping_address, quantity, variants,
    subscription_interval, cart_items
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
      total_amount: totalAmount,
      platform_fee: platformFee,
      provider_earnings: providerEarnings,
      fulfillment_method: fulfillment_method || 'local_delivery',
      delivery_address: delivery_address || shipping_address || '',
      status: 'confirmed',
      payment_status: 'paid',
      payment_method,
      notes: customer_notes,
      placed_at: now,
    });
  }

  // product_order and digital_product both use Order entity
  return await base44.asServiceRole.entities.Order.create({
    order_type,
    user_email: user.email,
    product_id: item_id,
    product_name: item_title,
    quantity: quantity || 1,
    item_price: totalAmount / (quantity || 1),
    subtotal: totalAmount,
    platform_fee: platformFee,
    total_amount: totalAmount,
    provider_email,
    fulfillment_method: fulfillment_method || 'shipping',
    shipping_address: JSON.stringify(shipping_address || delivery_address || {}),
    status: 'confirmed',
    payment_method,
    stripe_session_id: stripe_payment_intent_id || '',
    customer_notes: customer_notes || '',
  });
}

// ── Settle provider earnings via internal wallet transfer ─────────────────────
async function settleProviderEarnings(base44, opts) {
  const { order_type, order_id, provider_email, providerEarnings, platformFee, totalAmount } = opts;

  const providers = await base44.asServiceRole.entities.User.filter({ email: provider_email });
  if (providers.length === 0) return;

  const provider = providers[0];
  const currentBalance = parseFloat(provider.usd_balance || 0);
  const newBalance = parseFloat((currentBalance + providerEarnings).toFixed(2));

  // Update stats fields by vertical
  const statsUpdate = { usd_balance: newBalance };
  if (order_type === 'service_booking') {
    statsUpdate.total_service_earnings = parseFloat(((provider.total_service_earnings || 0) + providerEarnings).toFixed(2));
  } else if (order_type === 'food_order') {
    statsUpdate.total_service_earnings = parseFloat(((provider.total_service_earnings || 0) + providerEarnings).toFixed(2));
  } else {
    statsUpdate.total_service_earnings = parseFloat(((provider.total_service_earnings || 0) + providerEarnings).toFixed(2));
  }

  await base44.asServiceRole.entities.User.update(provider.id, statsUpdate);

  // Payment ledger entries
  await base44.asServiceRole.entities.Payment.create({
    amount_usd: providerEarnings,
    method: 'internal_transfer',
    status: 'completed',
    reference_type: 'booking',
    reference_id: order_id,
    recipient_email: provider_email,
    sender_email: 'platform@playsoflo.com',
    memo: `Provider earnings — ${order_type.replace(/_/g, ' ')}`,
  });

  if (platformFee > 0) {
    await base44.asServiceRole.entities.Payment.create({
      amount_usd: platformFee,
      method: 'internal_transfer',
      status: 'completed',
      reference_type: 'platform_fee',
      reference_id: order_id,
      sender_email: 'customer@playsoflo.com',
      recipient_email: 'platform@playsoflo.com',
      memo: `Platform fee — ${order_type.replace(/_/g, ' ')} (${Math.round((platformFee / totalAmount) * 100)}%)`,
    });
  }
}

// ── Dispatch a delivery driver ────────────────────────────────────────────────
async function dispatchDriver(base44, opts) {
  const { order_id, user, provider_email, provider_name, item_title, delivery_address, totalAmount, order_type } = opts;

  const orderNumber = `DLV${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  const deliveryFeeBase = Math.min(Math.max(totalAmount * 0.10, 3.99), 15.00);
  const driverEarnings = parseFloat((deliveryFeeBase * DRIVER_EARNINGS_RATE).toFixed(2));
  const driverPlatformFee = parseFloat((deliveryFeeBase - driverEarnings).toFixed(2));

  const deliveryOrder = await base44.asServiceRole.entities.DeliveryOrder.create({
    order_number: orderNumber,
    sender_name: provider_name || 'Provider',
    sender_phone: 'N/A',
    sender_email: provider_email,
    pickup_address: `Provider: ${provider_email}`,
    recipient_name: user.full_name || user.email,
    recipient_phone: user.phone || 'N/A',
    recipient_email: user.email,
    delivery_address: delivery_address || 'Address on file',
    package_type: order_type === 'food_order' ? 'food' : 'small_box',
    package_description: item_title,
    delivery_type: order_type === 'food_order' ? 'same_day' : 'standard',
    urgency_level: order_type === 'food_order' ? 'urgent' : 'normal',
    base_price: deliveryFeeBase,
    driver_earnings: driverEarnings,
    platform_fee: driverPlatformFee,
    total_price: deliveryFeeBase,
    status: 'pending',
    payment_status: 'paid',
    tracking_updates: [{
      timestamp: new Date().toISOString(),
      status: 'pending',
      message: 'Order placed, looking for available driver',
      location: delivery_address || '',
    }],
    special_instructions: `Linked to order #${order_id}`,
  });

  // Notify available drivers
  try {
    const vehicles = await base44.asServiceRole.entities.DeliveryVehicle.filter({ is_active: true });
    for (const v of vehicles.slice(0, 10)) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: v.driver_email,
        type: 'system_alert',
        title: order_type === 'food_order' ? '🍔 Food Delivery Job Available!' : '📦 Delivery Job Available!',
        message: `Deliver "${item_title}" to ${delivery_address}. Earn $${driverEarnings.toFixed(2)}. Tap to accept.`,
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

// ── Send all relevant notifications ──────────────────────────────────────────
async function sendAllNotifications(base44, opts) {
  const {
    order_type, user, provider_email, provider_name, item_title,
    totalAmount, order_id, booking_date, booking_time,
    fulfillment_method, delivery_order_id, payment_method
  } = opts;

  const typeLabels = {
    service_booking: 'Service Booking',
    product_order: 'Order',
    digital_product: 'Digital Purchase',
    subscription: 'Subscription',
    experience: 'Experience Booking',
    food_order: 'Food Order',
  };
  const label = typeLabels[order_type] || 'Order';
  const payLabel = payment_method === 'wallet' ? 'SoFlo Wallet' : 'Card';

  // Customer confirmation
  await base44.asServiceRole.entities.Notification.create({
    recipient_email: user.email,
    type: 'system_alert',
    title: `✅ ${label} Confirmed!`,
    message: booking_date
      ? `Your booking for "${item_title}" on ${booking_date} at ${booking_time} is confirmed. Paid $${totalAmount.toFixed(2)} via ${payLabel}.`
      : `Your ${label.toLowerCase()} for "${item_title}" is confirmed! Paid $${totalAmount.toFixed(2)} via ${payLabel}.`,
    reference_type: 'booking',
    reference_id: order_id,
    read: false,
  });

  // Provider new order notification
  await base44.asServiceRole.entities.Notification.create({
    recipient_email: provider_email,
    type: 'system_alert',
    title: `🛎️ New ${label}!`,
    message: booking_date
      ? `${user.full_name || user.email} booked "${item_title}" on ${booking_date} at ${booking_time}. You'll earn $${(totalAmount * (1 - (PLATFORM_FEE_RATES[order_type] || 0.15))).toFixed(2)} after platform fee.`
      : `${user.full_name || user.email} ordered "${item_title}". You'll earn $${(totalAmount * (1 - (PLATFORM_FEE_RATES[order_type] || 0.15))).toFixed(2)} after platform fee.`,
    reference_type: 'booking',
    reference_id: order_id,
    read: false,
  });

  // If local delivery, notify customer about driver dispatch
  if (delivery_order_id) {
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: user.email,
      type: 'system_alert',
      title: '🚗 Driver Being Dispatched',
      message: `A driver is being assigned to deliver your order. You'll be notified when they're on their way!`,
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
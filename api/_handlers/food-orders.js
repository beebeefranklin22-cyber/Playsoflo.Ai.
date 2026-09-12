import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';
import { round2 } from '../_lib/orderHelpers.js';

// Restaurant + driver side of the food order lifecycle, plus dispatching a
// paid order to delivery. food_orders' direct-insert/update policies were
// revoked for every authenticated user in 0004_lock_down_money_tables.sql
// (it's a money table — see api/checkout.js, the only other writer), so
// FoodCart/RestaurantOwnerHub/FoodDriverHub can no longer write to it
// directly. Every action here re-verifies the caller is actually a party
// to the order (provider_email, driver_email, or customer_email) before
// touching it with the service-role client, following the same pattern as
// api/delivery.js's completeDelivery.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const admin = getSupabaseAdmin();
  const { action } = req.body || {};

  try {
    if (action === 'update_status') return res.status(200).json(await updateStatus(admin, user, req.body));
    if (action === 'driver_accept') return res.status(200).json(await driverAccept(admin, user, req.body));
    if (action === 'dispatch') return res.status(200).json(await dispatch(admin, user, req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('food-orders action error:', action, err);
    return res.status(400).json({ error: err.message });
  }
}

// Restaurant-side transitions (RestaurantOwnerHub's Confirm/Start
// Preparing/Mark as Ready buttons). Cancellation goes through the existing
// api/bookings.js cancel_order action (it also handles the refund), not
// through here.
const RESTAURANT_STATUSES = ['confirmed', 'preparing', 'ready'];
// Driver-side transitions (FoodDriverHub's Picked Up/Start Delivery/Complete
// Delivery buttons).
const DRIVER_STATUSES = ['picked_up', 'on_the_way', 'delivered'];

async function loadOrder(admin, order_id) {
  const { data: order, error } = await admin.from('food_orders').select('*').eq('id', order_id).single();
  if (error || !order) throw new Error('Food order not found');
  return order;
}

async function updateStatus(admin, user, body) {
  const { order_id, new_status, delivery_photo_url } = body;
  const order = await loadOrder(admin, order_id);

  const isRestaurant = order.provider_email === user.email;
  const isDriver = !!order.driver_email && order.driver_email === user.email;
  if (!isRestaurant && !isDriver) throw new Error('You are not part of this order');
  if (isRestaurant && !RESTAURANT_STATUSES.includes(new_status)) {
    throw new Error(`Restaurants cannot set status "${new_status}"`);
  }
  if (isDriver && !DRIVER_STATUSES.includes(new_status)) {
    throw new Error(`Drivers cannot set status "${new_status}"`);
  }

  const updateData = { status: new_status };
  // Only the driver can attach delivery proof, and only when marking delivered.
  if (isDriver && new_status === 'delivered' && delivery_photo_url) {
    updateData.delivery_photo_url = delivery_photo_url;
  }

  const { error } = await admin.from('food_orders').update(updateData).eq('id', order_id);
  if (error) throw error;

  // Reaching 'delivered' credits the driver's earnings and settles the
  // linked delivery_orders row, mirroring api/delivery.js's completeDelivery.
  if (new_status === 'delivered' && order.status !== 'delivered') {
    const earnings = order.driver_earnings || round2((order.delivery_fee || 0) * 0.8) || 0;
    if (earnings > 0) {
      const { error: moveError } = await admin.rpc('wallet_move', {
        p_from_email: null,
        p_to_email: user.email,
        p_debit_amount: null,
        p_credit_amount: earnings,
        p_reference_type: 'food_delivery_earnings',
        p_reference_id: order_id,
        p_memo: null,
      });
      if (moveError) console.error('Failed to credit food delivery earnings for', order_id, moveError);
    }

    const { error: settleError } = await admin.from('food_orders').update({ payment_settled: true }).eq('id', order_id);
    if (settleError) console.error('Failed to mark food order settled for', order_id, settleError);

    if (order.delivery_order_id) {
      const { error: doError } = await admin.from('delivery_orders').update({ status: 'delivered' }).eq('id', order.delivery_order_id);
      if (doError) console.error('Failed to sync delivery_orders status for', order.delivery_order_id, doError);
    }
  }

  return { success: true };
}

// A driver claims an unassigned, restaurant-confirmed order (FoodDriverHub's
// "Accept Delivery" button). driver_name is a trusted display value, same
// trust boundary as item_title/provider_name elsewhere in checkout.
async function driverAccept(admin, user, body) {
  const { order_id, driver_name } = body;
  const order = await loadOrder(admin, order_id);
  if (order.driver_email) throw new Error('This order already has a driver assigned');
  if (order.status !== 'confirmed') throw new Error('Order is not ready to be accepted yet');

  const { error } = await admin
    .from('food_orders')
    .update({
      driver_email: user.email,
      driver_name: driver_name || user.email.split('@')[0],
      status: 'ready',
    })
    .eq('id', order_id);
  if (error) throw error;
  return { success: true };
}

// Backs dispatchFoodOrder, called by FoodCart right after a successful
// payment. Creates the delivery_orders row that makes the order visible to
// drivers (see FoodDriverHub) and links it back onto the food order via
// delivery_order_id, so status changes on either row can stay in sync.
// Idempotent: calling it again for an already-dispatched order just returns
// the existing link instead of creating a duplicate delivery.
async function dispatch(admin, user, body) {
  const { food_order_id, payment_intent_id } = body;
  if (!food_order_id) throw new Error('food_order_id is required');
  const order = await loadOrder(admin, food_order_id);
  if (order.customer_email !== user.email) throw new Error('You are not the customer on this order');
  if (order.delivery_order_id) return { success: true, delivery_order_id: order.delivery_order_id };

  const { data: deliveryRow, error: deliveryError } = await admin
    .from('delivery_orders')
    .insert({
      order_number: `FOOD-${Date.now().toString(36).toUpperCase()}`,
      sender_email: order.provider_email,
      sender_name: order.restaurant_name || order.item_title || 'Restaurant',
      pickup_address: order.restaurant_address || null,
      recipient_email: order.customer_email,
      delivery_address: order.delivery_address,
      package_type: 'food',
      delivery_type: 'same_day',
      urgency_level: 'urgent',
      pickup_coords: null,
      delivery_coords: order.delivery_coords || null,
      price_total: order.delivery_fee || 0,
      driver_earnings: order.driver_earnings || null,
      status: 'pending',
    })
    .select('id')
    .single();
  if (deliveryError) throw deliveryError;

  const { error: linkError } = await admin
    .from('food_orders')
    .update({
      delivery_order_id: deliveryRow.id,
      payment_intent_id: payment_intent_id || order.payment_intent_id,
    })
    .eq('id', food_order_id);
  if (linkError) throw linkError;

  return { success: true, delivery_order_id: deliveryRow.id };
}

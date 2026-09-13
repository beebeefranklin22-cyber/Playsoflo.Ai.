import { callSecureApi } from '@/lib/apiClient';

// Backs FoodCart's post-payment flow. Used to call a Supabase Edge Function
// (functions/v1/dispatchFoodOrder) that doesn't exist anywhere in this repo,
// so every food order silently failed to dispatch. Creates the
// delivery_orders row that makes a paid food order visible to drivers (see
// FoodDriverHub) and links it back onto the food order via
// delivery_order_id — both writes need the service role since food_orders'
// RLS forbids direct client writes (0004_lock_down_money_tables.sql), and
// only the customer on the order should be able to trigger this for their
// own order (enforced server-side in api/food-orders.js).
export async function dispatchFoodOrder({ food_order_id, payment_intent_id } = {}) {
  try {
    const data = await callSecureApi('/api/food-orders', { action: 'dispatch', food_order_id, payment_intent_id });
    return data;
  } catch (error) {
    console.error('Error dispatching food order:', error);
    throw error;
  }
}

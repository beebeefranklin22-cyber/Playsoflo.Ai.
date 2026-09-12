import { callSecureApi } from '@/lib/apiClient';

// Backs FoodDriverHub's "Accept Delivery" button. Used to call
// base44.entities.FoodOrder.update(...) directly, which silently failed
// after 0004_lock_down_money_tables.sql revoked authenticated writes on
// food_orders.
export async function acceptFoodOrder({ order_id, driver_name } = {}) {
  const data = await callSecureApi('/api/food-orders', { action: 'driver_accept', order_id, driver_name });
  return { data };
}

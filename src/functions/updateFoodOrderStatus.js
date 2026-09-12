import { callSecureApi } from '@/lib/apiClient';

// Backs RestaurantOwnerHub's Confirm/Start Preparing/Mark as Ready buttons
// and FoodDriverHub's Picked Up/Start Delivery/Complete Delivery buttons.
// Both used to call base44.entities.FoodOrder.update(...) directly, which
// silently failed after 0004_lock_down_money_tables.sql revoked
// authenticated writes on food_orders.
export async function updateFoodOrderStatus({ order_id, new_status, delivery_photo_url } = {}) {
  const data = await callSecureApi('/api/food-orders', { action: 'update_status', order_id, new_status, delivery_photo_url });
  return { data };
}

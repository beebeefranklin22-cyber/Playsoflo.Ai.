-- Food ordering was completely broken end-to-end: FoodCart.jsx inserted
-- directly into food_orders client-side, but 0004_lock_down_money_tables.sql
-- revoked authenticated INSERT/UPDATE on food_orders (along with the other
-- money tables) without this UI ever being migrated to the secure
-- api/checkout.js flow other hubs already use. This migration adds the one
-- column that flow needs and food_orders doesn't have yet: a structured
-- breakdown of the menu items in the order (food_orders previously only had
-- a legacy `items integer` column from the auto-generated baseline, which
-- can't hold per-item name/price/quantity).
--
-- Every other field the new checkout path and the food ordering UI
-- (FoodOrderTracking/RestaurantOwnerHub/FoodDriverHub) needs — customer_email,
-- provider_email, delivery_address, customer_notes, customer_phone,
-- restaurant_id/name/address/phone, delivery_fee, estimated_delivery_time,
-- driver_email/name, delivery_coords, delivery_order_id, etc. — already
-- exists on food_orders from 0001_baseline_schema.sql and
-- 0003_checkout_tables.sql.
alter table public.food_orders add column if not exists items jsonb;

-- FoodDriverHub's proof-of-delivery photo (uploaded when a driver marks an
-- order delivered) and FoodOrderTracking's display of it both already
-- reference this column; it never existed on food_orders.
alter table public.food_orders add column if not exists delivery_photo_url text;

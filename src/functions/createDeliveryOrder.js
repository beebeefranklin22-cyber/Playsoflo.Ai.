import { supabase } from '@/lib/supabaseClient';

export async function createDeliveryOrder({ order_data, pricing } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: { error: 'You must be signed in' } };

  const orderNumber = `DEL-${Date.now().toString(36).toUpperCase()}`;

  const { data: row, error } = await supabase
    .from('delivery_orders')
    .insert({
      order_number: orderNumber,
      sender_email: session.user.email,
      sender_name: order_data.sender_name,
      sender_phone: order_data.sender_phone,
      pickup_address: order_data.pickup_address,
      delivery_address: order_data.delivery_address,
      package_type: order_data.package_type,
      package_weight: order_data.package_weight,
      package_value: order_data.package_value,
      delivery_type: order_data.delivery_type,
      urgency_level: order_data.urgency_level,
      pickup_coords: order_data.pickup_coords,
      delivery_coords: order_data.delivery_coords,
      distance_miles: pricing?.distance_miles,
      price_total: pricing?.total_price,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return { data: { error: error.message } };
  return { data: { order: row, estimated_wait_minutes: 30 } };
}

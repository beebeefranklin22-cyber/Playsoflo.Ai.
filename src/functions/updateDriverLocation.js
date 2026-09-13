import { supabase } from '@/lib/supabaseClient';

export async function updateDriverLocation({ order_id, location } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: { error: 'You must be signed in' } };

  const { error } = await supabase
    .from('delivery_orders')
    .update({ current_location: location, location_updated_at: new Date().toISOString() })
    .eq('id', order_id)
    .eq('driver_email', session.user.email);

  if (error) return { data: { error: error.message } };
  return { data: { success: true } };
}

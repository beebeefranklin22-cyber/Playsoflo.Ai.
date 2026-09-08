import { supabase } from '@/lib/supabaseClient';

export async function createPropertyBooking(data = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: { error: 'You must be signed in to book' } };

  const { error, data: row } = await supabase
    .from('property_bookings')
    .insert({
      property_id: data.property_id,
      property_title: data.property_title,
      guest_email: session.user.email,
      host_email: data.host_email,
      check_in_date: data.check_in_date,
      check_out_date: data.check_out_date,
      number_of_guests: data.number_of_guests || 1,
      special_requests: data.special_requests || null,
      status: 'pending_review',
    })
    .select()
    .single();

  if (error) return { data: { error: error.message } };
  return { data: row };
}

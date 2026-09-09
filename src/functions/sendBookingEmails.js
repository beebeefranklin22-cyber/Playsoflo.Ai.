import { supabase } from '@/lib/supabaseClient';

const SUBJECTS = {
  cancellation: 'Your booking has been cancelled',
  confirmation: 'Your booking is confirmed',
  reminder: 'Upcoming booking reminder',
};

export async function sendBookingEmails({ booking_id, email_type } = {}) {
  const { data: booking } = await supabase.from('property_bookings').select('*').eq('id', booking_id).maybeSingle();
  if (!booking) return { data: { success: false, error: 'Booking not found' } };

  const subject = SUBJECTS[email_type] || 'Booking update';
  const body = `<p>Your booking for <strong>${booking.property_title || 'your stay'}</strong> has an update: ${subject}.</p>`;

  try {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: booking.guest_email, subject, body }),
    });
    const json = await res.json();
    return { data: { success: res.ok, error: res.ok ? undefined : json.error } };
  } catch (error) {
    return { data: { success: false, error: error.message } };
  }
}

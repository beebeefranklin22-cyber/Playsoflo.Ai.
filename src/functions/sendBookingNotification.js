import { supabase } from '@/lib/supabaseClient';

const TITLES = {
  booking_confirmed: 'Booking Confirmed',
  new_booking: 'New Booking Request',
  new_order: 'New Order',
  order_confirmed: 'Order Confirmed',
  payment_completed: 'Payment Successful',
  payment_received: 'Payment Received',
  booking_cancelled: 'Booking Cancelled',
};

async function notify({ recipient_email, type, title, message, reference_id }) {
  const { error } = await supabase.from('notifications').insert({
    recipient_email,
    type: 'booking_update',
    title: title || TITLES[type] || 'Booking Update',
    message,
    reference_id,
    reference_type: 'booking',
    read: false,
  });
  return !error;
}

// Singular: {recipientEmail, type, bookingId, bookingTitle, ...} — used by
// QuickBookingFlow, EcommerceOrderModal, LuxuryBookingModal.
export async function sendBookingNotification(params = {}) {
  const { recipientEmail, type, bookingId, bookingTitle, totalPrice, customerName, providerName, bookingDate, bookingTime } = params;
  const parts = [bookingTitle];
  if (bookingDate) parts.push(`on ${bookingDate}${bookingTime ? ` at ${bookingTime}` : ''}`);
  if (totalPrice) parts.push(`— $${Number(totalPrice).toFixed(2)}`);
  if (customerName) parts.push(`(from ${customerName})`);
  if (providerName) parts.push(`(with ${providerName})`);

  const success = await notify({
    recipient_email: recipientEmail,
    type,
    message: parts.filter(Boolean).join(' '),
    reference_id: bookingId,
  });
  return { data: { success } };
}

// Plural: {booking_id, notification_type, provider_email, customer_email,
// service_title, booking_date, booking_time, total_price,
// confirmation_code, cancellation_reason} — notifies BOTH parties at
// once. Used by BookingRequestsSection, BookingModal.
export async function sendBookingNotifications(params = {}) {
  const { booking_id, notification_type, provider_email, customer_email, service_title, booking_date, booking_time, total_price, confirmation_code, cancellation_reason } = params;
  const parts = [service_title];
  if (booking_date) parts.push(`on ${booking_date}${booking_time ? ` at ${booking_time}` : ''}`);
  if (total_price) parts.push(`— $${Number(total_price).toFixed(2)}`);
  if (confirmation_code) parts.push(`(confirmation: ${confirmation_code})`);
  if (cancellation_reason) parts.push(`— ${cancellation_reason}`);
  const message = parts.filter(Boolean).join(' ');

  const results = await Promise.all([
    customer_email && notify({ recipient_email: customer_email, type: notification_type, message, reference_id: booking_id }),
    provider_email && notify({ recipient_email: provider_email, type: notification_type, message, reference_id: booking_id }),
  ]);
  return { data: { success: results.every((r) => r !== false) } };
}

import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';

// Backs updateBookingStatus and cancelOrderSecure. Cancelling a paid order
// reverses the earnings api/checkout.js already credited to the provider
// (wallet_move debits them back) and refunds the customer's full total —
// funded as a pure credit rather than requiring the platform to hold its
// own balance row, since the real money was actually collected via Stripe
// or the customer's own wallet at checkout time either way. If the
// provider's balance can't cover the clawback (e.g. they already withdrew
// it), the cancellation is rejected rather than silently under-refunding.
const TABLE_BY_RESOURCE = {
  service_booking: 'service_bookings',
  food_order: 'food_orders',
  order: 'orders',
};

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
    if (action === 'cancel_order') return res.status(200).json(await cancelOrder(admin, user, req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('bookings action error:', action, err);
    return res.status(400).json({ success: false, error: err.message });
  }
}

async function updateStatus(admin, user, body) {
  const { bookingId, newStatus, reason } = body;
  const { data: booking, error: fetchError } = await admin
    .from('service_bookings')
    .select('*')
    .eq('id', bookingId)
    .single();
  if (fetchError || !booking) throw new Error('Booking not found');
  if (booking.customer_email !== user.email && booking.provider_email !== user.email) {
    throw new Error('You are not part of this booking');
  }
  // Only the customer's own no-questions-asked action; anything else
  // (provider confirming/completing) is a provider-side call we trust
  // them on for now since no fee/refund is involved either way.
  if (booking.customer_email === user.email) {
    if (newStatus !== 'cancelled') {
      // A customer has no legitimate reason to set any status but
      // "cancelled" on their own booking -- this used to write whatever
      // status string the client sent with no check at all, letting a
      // customer self-approve their own booking as "completed".
      throw new Error('Customers can only cancel a booking, not change its status');
    }
    if (booking.status === 'completed') throw new Error('This booking has already been completed and can no longer be cancelled');
    if (booking.status !== 'cancelled') await refundBooking(admin, booking, reason);
  } else {
    const { error } = await admin
      .from('service_bookings')
      .update({ status: newStatus, special_requirements: reason ? `${booking.special_requirements || ''}\n${reason}`.trim() : booking.special_requirements })
      .eq('id', bookingId);
    if (error) throw error;
  }
  return { success: true };
}

async function cancelOrder(admin, user, body) {
  const { order_id, cancellation_reason } = body;
  const { data: order, error: fetchError } = await admin
    .from('food_orders')
    .select('*')
    .eq('id', order_id)
    .single();
  if (fetchError || !order) throw new Error('Order not found');
  if (order.provider_email !== user.email && order.customer_email !== user.email) {
    throw new Error('You are not part of this order');
  }
  if (order.status === 'cancelled') return { success: true };
  // This used to allow a full refund from ANY status, including
  // "delivered" -- a customer could receive their food and then call
  // cancel_order for a complete refund while the restaurant/driver's
  // earnings were clawed back out from under them.
  if (order.status === 'delivered') throw new Error('This order has already been delivered and can no longer be cancelled');

  await refundBooking(admin, order, cancellation_reason, 'food_orders');
  return { success: true };
}

async function refundBooking(admin, booking, reason, table = 'service_bookings') {
  // service_bookings stores this as total_price, not total_amount (orders/
  // food_orders use total_amount) -- this gate used to check total_amount
  // only, so it was always falsy for a service booking and the refund
  // silently never ran at all: the booking was marked "cancelled" and the
  // customer was told it succeeded, but no money ever moved back to them.
  const totalPaid = booking.total_amount ?? booking.total_price;
  if (booking.payment_method && totalPaid) {
    const { error: moveError } = await admin.rpc('wallet_move', {
      p_from_email: booking.provider_email,
      p_to_email: booking.customer_email,
      p_debit_amount: booking.provider_earnings || 0,
      p_credit_amount: totalPaid,
      p_reference_type: 'refund',
      p_reference_id: booking.id,
      p_memo: reason || 'Booking cancelled',
    });
    if (moveError) {
      if (String(moveError.message).includes('insufficient balance')) {
        throw new Error('Cannot process refund automatically — provider balance is insufficient. Contact support.');
      }
      throw moveError;
    }
  }

  const { error } = await admin
    .from(table)
    .update({ status: 'cancelled' })
    .eq('id', booking.id);
  if (error) throw error;
}

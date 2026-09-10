// property_bookings (the real table api/property-booking.js writes to) uses
// its own field names and status values. Several existing
// display components (PropertyDashboard, PropertyCalendar,
// UserBookingsCalendar, BookingCancellationModal) were built against a
// generic "booking" shape (experience_title, booking_date, booking_status,
// total_price_usd, ...) that was never actually populated for properties.
// Rather than rename fields across every one of those display components,
// normalize property_bookings rows into that shape once, here.
export function mapPropertyBookingToGeneric(pb) {
  const bookingStatus =
    pb.status === 'confirmed' ? 'confirmed'
    : pb.status === 'pending_review' || pb.status === 'approved_awaiting_payment' ? 'pending'
    : pb.status === 'declined' || pb.status === 'cancelled' ? 'cancelled'
    : pb.status;

  return {
    id: pb.id,
    experience_id: pb.property_id,
    experience_title: pb.property_title,
    booking_date: pb.check_in_date,
    checkout_date: pb.check_out_date,
    booking_status: bookingStatus,
    number_of_guests: pb.number_of_guests,
    total_price_usd: pb.total_price,
    payment_status: pb.status === 'confirmed' ? 'paid' : pb.status === 'approved_awaiting_payment' ? 'awaiting_payment' : 'unpaid',
    created_date: pb.created_date,
    provider_email: pb.host_email,
    created_by: pb.guest_email,
    special_requests: pb.special_requests,
    // The underlying property_booking status machine has states this
    // generic shape can't express (pending_review vs
    // approved_awaiting_payment) — keep the raw row for anything that
    // needs to act on the real status (approve/decline/pay/cancel).
    _raw: pb,
  };
}

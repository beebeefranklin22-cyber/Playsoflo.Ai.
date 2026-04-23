import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * processServicePayment
 * Handles wallet-based payment for service bookings.
 * Deducts from customer, then delegates provider settlement to universal settlePayment engine.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id, payment_method } = await req.json();
    if (!booking_id || !payment_method) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const bookings = await base44.entities.ServiceBooking.filter({ id: booking_id });
    if (bookings.length === 0) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];
    const totalAmount = booking.total_price || 0;

    if (totalAmount <= 0) {
      return Response.json({ error: 'Invalid booking amount' }, { status: 400 });
    }

    if (booking.payment_status === 'paid') {
      return Response.json({ error: 'Booking already paid' }, { status: 400 });
    }

    if (payment_method !== 'wallet') {
      return Response.json({ error: 'Unsupported payment method' }, { status: 400 });
    }

    // Check and deduct customer balance
    if ((user.usd_balance || 0) < totalAmount) {
      return Response.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const newCustomerBalance = parseFloat(((user.usd_balance || 0) - totalAmount).toFixed(2));
    await base44.asServiceRole.entities.User.update(user.id, { usd_balance: newCustomerBalance });

    // Mark booking as paid/confirmed
    await base44.asServiceRole.entities.ServiceBooking.update(booking.id, {
      payment_status: 'paid',
      booking_status: 'confirmed',
      paid_at: new Date().toISOString()
    });

    // Notify customer
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: user.email,
      type: 'system_alert',
      title: '✅ Booking Confirmed',
      message: `Your booking for ${booking.service_name} is confirmed! Provider will contact you soon.`,
      reference_type: 'booking',
      reference_id: booking.id
    });

    // Settle provider earnings via universal engine
    const settlement = await base44.functions.invoke('settlePayment', {
      vertical: 'service_booking',
      reference_id: booking.id,
      provider_email: booking.provider_email
    });

    return Response.json({
      success: true,
      booking_id: booking.id,
      provider_earnings: settlement.data?.earnings || 0,
      platform_fee: settlement.data?.platform_fee || 0,
      customer_new_balance: newCustomerBalance,
      provider_new_balance: settlement.data?.new_wallet_balance || 0
    });

  } catch (error) {
    console.error('Service payment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
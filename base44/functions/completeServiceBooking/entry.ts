import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id } = await req.json();
    if (!booking_id) {
      return Response.json({ error: 'Missing booking_id' }, { status: 400 });
    }

    const bookings = await base44.asServiceRole.entities.ServiceBooking.filter({ id: booking_id });
    if (bookings.length === 0) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];

    if (booking.provider_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Mark booking completed
    await base44.asServiceRole.entities.ServiceBooking.update(booking.id, {
      booking_status: 'completed',
      completed_at: new Date().toISOString()
    });

    // If escrow is active, release it
    if (booking.escrow_enabled && booking.payment_status === 'held_in_escrow') {
      const escrowTransactions = await base44.asServiceRole.entities.EscrowTransaction.filter({
        reference_id: booking.id,
        status: 'held'
      });

      if (escrowTransactions.length > 0) {
        const escrow = escrowTransactions[0];
        await base44.asServiceRole.entities.EscrowTransaction.update(escrow.id, {
          status: 'released',
          released_at: new Date().toISOString()
        });

        // Settle via universal engine using escrow amount
        await base44.functions.invoke('settlePayment', {
          vertical: 'service_booking',
          reference_id: booking.id,
          provider_email: booking.provider_email,
          earnings_override: escrow.amount
        });
      }
    } else {
      // Normal (non-escrow) settlement
      await base44.functions.invoke('settlePayment', {
        vertical: 'service_booking',
        reference_id: booking.id,
        provider_email: booking.provider_email
      });
    }

    // Notify customer with review prompt
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: booking.user_email,
      type: 'booking_update',
      title: 'Rate Your Service',
      message: `How was your ${booking.service_title || 'service'} experience?`,
      reference_type: 'booking',
      reference_id: booking.id,
      metadata: {
        action: 'review',
        booking_id: booking.id,
        provider_email: booking.provider_email
      }
    });

    return Response.json({
      success: true,
      message: 'Booking completed and provider paid'
    });

  } catch (error) {
    console.error('Complete booking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
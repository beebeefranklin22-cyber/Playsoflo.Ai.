import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, newStatus, reason } = await req.json();

    if (!bookingId || !newStatus) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the booking
    const booking = await base44.entities.ServiceBooking.get(bookingId);
    
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify user is customer or provider
    if (booking.customer_email !== user.email && booking.provider_email !== user.email) {
      return Response.json({ error: 'Unauthorized to modify this booking' }, { status: 403 });
    }

    // Update booking status
    await base44.entities.ServiceBooking.update(bookingId, {
      status: newStatus,
      ...(reason && { cancellation_reason: reason }),
      ...(newStatus === 'cancelled' && { cancelled_at: new Date().toISOString() })
    });

    // Send notification to both parties
    await base44.asServiceRole.functions.invoke('sendBookingStatusNotification', {
      bookingId,
      status: newStatus,
      customerEmail: booking.customer_email,
      providerEmail: booking.provider_email,
      bookingTitle: booking.service_title
    });

    return Response.json({ 
      success: true, 
      message: `Booking ${newStatus} successfully` 
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
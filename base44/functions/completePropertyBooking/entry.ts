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

    const bookings = await base44.asServiceRole.entities.Booking.filter({ id: booking_id });
    if (bookings.length === 0) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];

    if (booking.provider_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - not your property' }, { status: 403 });
    }

    // Mark booking completed
    await base44.asServiceRole.entities.Booking.update(booking.id, {
      booking_status: 'completed'
    });

    // Settle host earnings via universal settlement engine
    const settlement = await base44.functions.invoke('settlePayment', {
      vertical: 'property',
      reference_id: booking.id,
      provider_email: booking.provider_email
    });

    // Notify guest with review prompt
    const properties = await base44.asServiceRole.entities.Property.filter({ id: booking.property_id });
    const property = properties[0];

    await base44.asServiceRole.entities.Notification.create({
      recipient_email: booking.created_by,
      type: 'booking_update',
      title: 'Rate Your Stay',
      message: `How was your stay at ${property?.title || 'the property'}?`,
      reference_type: 'booking',
      reference_id: booking.id,
      metadata: {
        action: 'review',
        booking_id: booking.id,
        property_id: booking.property_id,
        host_email: booking.provider_email
      }
    });

    return Response.json({
      success: true,
      host_earnings: settlement.data?.earnings || 0,
      message: 'Booking completed and host paid'
    });

  } catch (error) {
    console.error('Complete property booking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
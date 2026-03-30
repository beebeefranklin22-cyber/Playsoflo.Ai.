import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

    // Get booking
    const bookings = await base44.asServiceRole.entities.Booking.filter({ id: booking_id });
    
    if (bookings.length === 0) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];

    // Only host or admin can complete
    if (booking.provider_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - not your property' }, { status: 403 });
    }

    // Update booking to completed
    await base44.asServiceRole.entities.Booking.update(booking.id, {
      booking_status: 'completed'
    });

    // Check if already paid to prevent double-payment
    const existingPayments = await base44.asServiceRole.entities.Payment.filter({
      reference_type: 'booking',
      reference_id: booking.id,
      recipient_email: booking.provider_email,
      memo: 'Property booking host earnings'
    });

    if (existingPayments.length > 0) {
      return Response.json({ 
        success: true, 
        message: 'Host already paid for this booking' 
      });
    }

    // Pay host instantly - 81% after 19% platform commission
    const totalAmount = parseFloat(booking.total_price_usd) || 0;
    const platformCommission = totalAmount * 0.19;
    const hostEarnings = totalAmount - platformCommission;

    const hosts = await base44.asServiceRole.entities.User.filter({ email: booking.provider_email });
    
    if (hosts.length > 0) {
      const host = hosts[0];
      const currentBalance = parseFloat(host.usd_balance) || 0;
      const newBalance = currentBalance + hostEarnings;
      
      // Update host balance instantly
      await base44.asServiceRole.entities.User.update(host.id, {
        usd_balance: newBalance,
        total_property_earnings: (parseFloat(host.total_property_earnings) || 0) + hostEarnings
      });

      // Record payment
      await base44.asServiceRole.entities.Payment.create({
        amount_usd: hostEarnings,
        method: 'internal_transfer',
        status: 'completed',
        reference_type: 'booking',
        reference_id: booking.id,
        recipient_email: booking.provider_email,
        sender_email: booking.created_by,
        memo: 'Property booking host earnings'
      });

      // Record platform fee
      await base44.asServiceRole.entities.Payment.create({
        amount_usd: platformCommission,
        method: 'internal_transfer',
        status: 'completed',
        reference_type: 'platform_fee',
        reference_id: booking.id,
        sender_email: booking.created_by,
        recipient_email: 'platform@playsoflo.com',
        memo: 'Platform commission (19%) from property booking'
      });

      // Notify host
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: booking.provider_email,
        type: 'payment_received',
        title: '💰 Booking Completed - Earnings Added',
        message: `$${hostEarnings.toFixed(2)} from property booking instantly added to your wallet! New balance: $${newBalance.toFixed(2)}`,
        reference_type: 'booking',
        reference_id: booking.id
      });
    }

    // Get property for notification
    const properties = await base44.asServiceRole.entities.Property.filter({ id: booking.property_id });
    const property = properties[0];

    // Notify guest with review prompt
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
      host_earnings: hostEarnings,
      message: 'Booking completed and host paid'
    });

  } catch (error) {
    console.error('Complete property booking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
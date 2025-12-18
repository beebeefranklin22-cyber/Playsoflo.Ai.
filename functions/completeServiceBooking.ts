import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { booking_id } = await req.json();

    // Fetch booking
    const bookings = await base44.asServiceRole.entities.ServiceBooking.filter({ id: booking_id });
    if (bookings.length === 0) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];

    // Only provider or admin can mark as complete
    if (booking.provider_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update booking to completed
    await base44.asServiceRole.entities.ServiceBooking.update(booking.id, {
      booking_status: 'completed',
      completed_at: new Date().toISOString()
    });

    // If escrow is enabled, release funds to provider now
    if (booking.escrow_enabled && booking.payment_status === 'held_in_escrow') {
      const escrowTransactions = await base44.asServiceRole.entities.EscrowTransaction.filter({
        reference_id: booking.id,
        status: 'held'
      });

      if (escrowTransactions.length > 0) {
        const escrow = escrowTransactions[0];
        
        // Release escrow to provider
        const providers = await base44.asServiceRole.entities.User.filter({ email: booking.provider_email });
        if (providers.length > 0) {
          const provider = providers[0];
          const releaseAmount = escrow.amount;
          
          await base44.asServiceRole.entities.User.update(provider.id, {
            usd_balance: (provider.usd_balance || 0) + releaseAmount
          });

          await base44.asServiceRole.entities.EscrowTransaction.update(escrow.id, {
            status: 'released',
            released_at: new Date().toISOString()
          });

          await base44.asServiceRole.entities.Notification.create({
            recipient_email: booking.provider_email,
            type: 'payment_received',
            title: '💰 Escrow Released',
            message: `$${releaseAmount.toFixed(2)} has been released from escrow and added to your wallet!`,
            reference_type: 'escrow',
            reference_id: escrow.id
          });
        }
      }
    }

    // Notify customer to leave a review
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: booking.user_email,
      type: 'system_alert',
      title: '⭐ Service Completed',
      message: `Your booking with ${booking.provider_email} is complete! Please leave a review.`,
      reference_type: 'booking',
      reference_id: booking.id
    });

    return Response.json({
      success: true,
      message: 'Booking marked as completed'
    });

  } catch (error) {
    console.error('Complete booking error:', error);
    return Response.json({ 
      error: 'Failed to complete booking',
      details: error.message 
    }, { status: 500 });
  }
});
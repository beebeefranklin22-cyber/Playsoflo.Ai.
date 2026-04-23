import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rental_id } = await req.json();
    if (!rental_id) {
      return Response.json({ error: 'Missing rental_id' }, { status: 400 });
    }

    const rentals = await base44.asServiceRole.entities.CarRental.filter({ id: rental_id });
    if (rentals.length === 0) {
      return Response.json({ error: 'Rental not found' }, { status: 404 });
    }

    const rental = rentals[0];

    if (rental.provider_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Mark rental completed
    await base44.asServiceRole.entities.CarRental.update(rental.id, {
      status: 'completed'
    });

    // Settle provider earnings via universal settlement engine
    const settlement = await base44.functions.invoke('settlePayment', {
      vertical: 'car_rental',
      reference_id: rental.id,
      provider_email: rental.provider_email
    });

    // Notify renter with review prompt
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: rental.renter_email,
      type: 'booking_update',
      title: 'Rate Your Rental',
      message: `How was your rental experience?`,
      reference_type: 'car_rental',
      reference_id: rental.id,
      metadata: {
        action: 'review',
        rental_id: rental.id,
        owner_email: rental.provider_email
      }
    });

    return Response.json({
      success: true,
      provider_earnings: settlement.data?.earnings || 0,
      message: 'Rental completed and provider paid'
    });

  } catch (error) {
    console.error('Complete car rental error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
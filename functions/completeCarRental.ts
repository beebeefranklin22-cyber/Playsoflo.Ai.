import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

    // Get rental
    const rentals = await base44.asServiceRole.entities.CarRental.filter({ id: rental_id });
    
    if (rentals.length === 0) {
      return Response.json({ error: 'Rental not found' }, { status: 404 });
    }

    const rental = rentals[0];

    // Only provider or admin can complete
    if (rental.provider_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update rental to completed
    await base44.asServiceRole.entities.CarRental.update(rental.id, {
      status: 'completed'
    });

    // Check if already paid to prevent double-payment
    const existingPayments = await base44.asServiceRole.entities.Payment.filter({
      reference_type: 'car_rental',
      reference_id: rental.id,
      recipient_email: rental.provider_email,
      memo: 'Car rental provider earnings'
    });

    if (existingPayments.length > 0) {
      return Response.json({ 
        success: true, 
        message: 'Provider already paid for this rental' 
      });
    }

    // Pay provider instantly
    const providerEarnings = parseFloat(rental.provider_earnings) || 0;

    if (providerEarnings > 0) {
      const providers = await base44.asServiceRole.entities.User.filter({ email: rental.provider_email });
      
      if (providers.length > 0) {
        const provider = providers[0];
        const currentBalance = parseFloat(provider.usd_balance) || 0;
        const newBalance = currentBalance + providerEarnings;
        
        // Update provider balance and stats instantly
        await base44.asServiceRole.entities.User.update(provider.id, {
          usd_balance: newBalance,
          total_rental_earnings: (parseFloat(provider.total_rental_earnings) || 0) + providerEarnings
        });

        // Record payment
        await base44.asServiceRole.entities.Payment.create({
          amount_usd: providerEarnings,
          method: 'internal_transfer',
          status: 'completed',
          reference_type: 'car_rental',
          reference_id: rental.id,
          recipient_email: rental.provider_email,
          sender_email: rental.renter_email,
          memo: 'Car rental provider earnings'
        });

        // Notify provider
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: rental.provider_email,
          type: 'payment_received',
          title: '💰 Rental Completed - Earnings Added',
          message: `$${providerEarnings.toFixed(2)} from car rental instantly added to your wallet! New balance: $${newBalance.toFixed(2)}`,
          reference_type: 'car_rental',
          reference_id: rental.id
        });
      }
    }

    // Notify renter
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: rental.renter_email,
      type: 'system_alert',
      title: '🚗 Rental Completed',
      message: `Your car rental has been completed! Please leave a review.`,
      reference_type: 'car_rental',
      reference_id: rental.id
    });

    return Response.json({
      success: true,
      provider_earnings: providerEarnings,
      message: 'Rental completed and provider paid'
    });

  } catch (error) {
    console.error('Complete car rental error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
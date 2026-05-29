import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ride_id } = await req.json();
    if (!ride_id) {
      return Response.json({ error: 'Missing ride_id' }, { status: 400 });
    }

    const rides = await base44.asServiceRole.entities.RideRequest.filter({ id: ride_id });
    if (rides.length === 0) {
      return Response.json({ error: 'Ride not found' }, { status: 404 });
    }

    const ride = rides[0];

    if (ride.driver_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - not your ride' }, { status: 403 });
    }

    // Mark ride completed
    await base44.asServiceRole.entities.RideRequest.update(ride.id, {
      status: 'completed',
      end_time: new Date().toISOString()
    });

    // Settle driver earnings via universal settlement engine.
    // If a precise driver_earnings amount was stored on the fare breakdown, pass it
    // through directly (earnings_override); otherwise fall back to a 90% split.
    const totalFare = ride.fare_breakdown?.total_fare || 0;
    const storedDriverEarnings = ride.fare_breakdown?.driver_earnings || 0;
    const driverPercentage = totalFare > 0 && storedDriverEarnings > 0
      ? (storedDriverEarnings / totalFare) * 100
      : 90;

    const settlement = await base44.functions.invoke('settlePayment', {
      vertical: 'ride',
      reference_id: ride.id,
      provider_email: ride.driver_email,
      total_fare: totalFare,
      driver_percentage: driverPercentage
    });

    // Notify passenger with review prompt
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: ride.created_by,
      type: 'ride_update',
      title: 'Rate Your Driver',
      message: 'Your ride has been completed! How was your experience?',
      reference_type: 'ride',
      reference_id: ride.id,
      metadata: {
        action: 'review',
        ride_id: ride.id,
        driver_email: ride.driver_email
      }
    });

    return Response.json({
      success: true,
      driver_earnings: settlement.data?.earnings || 0,
      new_balance: settlement.data?.new_wallet_balance || 0,
      message: 'Ride completed and driver paid'
    });

  } catch (error) {
    console.error('Complete ride error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
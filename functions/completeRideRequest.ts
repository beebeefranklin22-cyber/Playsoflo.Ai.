import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

    // Get the ride
    const rides = await base44.asServiceRole.entities.RideRequest.filter({ id: ride_id });
    
    if (rides.length === 0) {
      return Response.json({ error: 'Ride not found' }, { status: 404 });
    }

    const ride = rides[0];

    // Only driver or admin can complete
    if (ride.driver_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - not your ride' }, { status: 403 });
    }

    // Update ride to completed
    await base44.asServiceRole.entities.RideRequest.update(ride.id, {
      status: 'completed',
      end_time: new Date().toISOString()
    });

    // Pay driver instantly - 90% of fare
    const driverPercentage = ride.driver_earnings?.driver_percentage || 90;
    const totalFare = ride.fare_breakdown?.total_fare || 0;
    const driverEarnings = (totalFare * driverPercentage) / 100;

    // Check if already paid to prevent double-payment
    const existingPayments = await base44.asServiceRole.entities.Payment.filter({
      reference_type: 'other',
      reference_id: ride.id,
      recipient_email: user.email,
      memo: 'Ride driver earnings'
    });

    if (existingPayments.length > 0) {
      return Response.json({ 
        success: true, 
        message: 'Driver already paid for this ride' 
      });
    }

    // Update driver balance instantly
    const drivers = await base44.asServiceRole.entities.User.filter({ email: user.email });
    
    if (drivers.length > 0) {
      const driver = drivers[0];
      const currentBalance = parseFloat(driver.usd_balance) || 0;
      const newBalance = currentBalance + driverEarnings;
      
      await base44.asServiceRole.entities.User.update(driver.id, {
        usd_balance: newBalance
      });

      // Record payment
      await base44.asServiceRole.entities.Payment.create({
        amount_usd: driverEarnings,
        method: 'internal_transfer',
        status: 'completed',
        reference_type: 'other',
        reference_id: ride.id,
        recipient_email: user.email,
        sender_email: 'platform@playsoflo.com',
        memo: 'Ride driver earnings'
      });

      // Update driver stats
      await base44.asServiceRole.entities.User.update(driver.id, {
        total_rides_completed: (driver.total_rides_completed || 0) + 1,
        total_driver_earnings: (driver.total_driver_earnings || 0) + driverEarnings
      });

      // Notify driver
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: user.email,
        type: 'payment_received',
        title: '💰 Ride Completed - Earnings Added',
        message: `You earned $${driverEarnings.toFixed(2)} from this ride! New balance: $${newBalance.toFixed(2)}`,
        reference_type: 'ride',
        reference_id: ride.id
      });
    }

    // Notify passenger
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: ride.created_by,
      type: 'system_alert',
      title: '🚗 Ride Completed',
      message: `Your ride has been completed! Please rate your driver.`,
      reference_type: 'ride',
      reference_id: ride.id
    });

    return Response.json({
      success: true,
      driver_earnings: driverEarnings,
      new_balance: newBalance,
      message: 'Ride completed and driver paid'
    });

  } catch (error) {
    console.error('Complete ride error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
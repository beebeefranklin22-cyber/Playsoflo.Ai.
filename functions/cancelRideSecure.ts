import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ride_id, user_email, cancellation_reason, cancellation_fee } = await req.json();

    if (!ride_id || !user_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user owns this ride
    const rides = await base44.entities.RideRequest.filter({ id: ride_id });
    const ride = rides[0];

    if (!ride) {
      return Response.json({ error: 'Ride not found' }, { status: 404 });
    }

    if (ride.created_by !== user_email) {
      return Response.json({ error: 'Unauthorized to cancel this ride' }, { status: 403 });
    }

    // Prevent cancellation of completed/in-progress rides
    if (['completed', 'in_progress'].includes(ride.status)) {
      return Response.json({ error: 'Cannot cancel ride in progress or completed' }, { status: 400 });
    }

    // Validate cancellation fee matches server-side calculation
    let serverCalculatedFee = 0;
    switch (ride.status) {
      case "requested":
        serverCalculatedFee = 0;
        break;
      case "accepted":
      case "en_route":
        serverCalculatedFee = 5.00;
        break;
      case "arrived":
        serverCalculatedFee = (ride.fare_breakdown?.total_fare || 20) * 0.5;
        break;
    }

    // Security: Ensure fee matches server calculation
    if (Math.abs(cancellation_fee - serverCalculatedFee) > 0.01) {
      return Response.json({ error: 'Invalid cancellation fee' }, { status: 400 });
    }

    // Check balance if fee required
    if (serverCalculatedFee > 0 && user.balance_usd < serverCalculatedFee) {
      return Response.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Process cancellation fee using service role
    if (serverCalculatedFee > 0) {
      const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, {
          balance_usd: (users[0].balance_usd || 0) - serverCalculatedFee
        });
      }

      // Create payment record
      await base44.entities.Payment.create({
        amount_usd: serverCalculatedFee,
        amount_rri: 0,
        method: "wallet",
        status: "completed",
        reference_type: "other",
        reference_id: ride_id,
        sender_email: user_email,
        memo: `Ride cancellation fee - ${ride.status}`
      });

      // Compensate driver if assigned
      if (ride.driver_email) {
        const drivers = await base44.asServiceRole.entities.User.filter({ email: ride.driver_email });
        if (drivers.length > 0) {
          const compensation = serverCalculatedFee * 0.8; // 80% to driver
          await base44.asServiceRole.entities.User.update(drivers[0].id, {
            balance_usd: (drivers[0].balance_usd || 0) + compensation
          });
        }
      }
    }

    // Update ride status to cancelled
    await base44.entities.RideRequest.update(ride_id, {
      status: "cancelled",
      notes: cancellation_reason || "Cancelled by passenger"
    });

    // Notify driver if assigned
    if (ride.driver_email) {
      await base44.entities.Notification.create({
        recipient_email: ride.driver_email,
        type: "ride_cancelled",
        title: "Ride Cancelled",
        message: `Passenger cancelled the ride. ${serverCalculatedFee > 0 ? `You received $${(serverCalculatedFee * 0.8).toFixed(2)} compensation.` : ''}`,
        reference_id: ride_id,
        reference_type: "ride_request",
        read: false
      });
    }

    return Response.json({ 
      success: true,
      cancellation_fee: serverCalculatedFee,
      message: "Ride cancelled successfully"
    });

  } catch (error) {
    console.error("Cancellation error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
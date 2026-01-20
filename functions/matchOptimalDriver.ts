import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { ride_id } = await req.json();

    if (!ride_id) {
      return Response.json({ error: 'Ride ID required' }, { status: 400 });
    }

    // Get ride details
    const rides = await base44.asServiceRole.entities.RideRequest.filter({ id: ride_id });
    const ride = rides[0];

    if (!ride) {
      return Response.json({ error: 'Ride not found' }, { status: 404 });
    }

    // Get all available drivers
    const allUsers = await base44.asServiceRole.entities.User.list();
    const availableDrivers = allUsers.filter(user => 
      user.is_driver && 
      user.driver_status === 'available' &&
      user.driver_location
    );

    if (availableDrivers.length === 0) {
      return Response.json({ error: 'No available drivers' }, { status: 404 });
    }

    const pickupLat = ride.pickup_coords[0];
    const pickupLng = ride.pickup_coords[1];
    const dropoffLat = ride.dropoff_coords[0];
    const dropoffLng = ride.dropoff_coords[1];

    // Calculate ride direction vector
    const rideDirLat = dropoffLat - pickupLat;
    const rideDirLng = dropoffLng - pickupLng;
    const rideDirMagnitude = Math.sqrt(rideDirLat * rideDirLat + rideDirLng * rideDirLng);

    // Score each driver
    const scoredDrivers = availableDrivers.map(driver => {
      const driverLat = driver.driver_location.latitude;
      const driverLng = driver.driver_location.longitude;

      // 1. Calculate distance from driver to pickup (in km using Haversine formula)
      const R = 6371; // Earth's radius in km
      const dLat = (pickupLat - driverLat) * Math.PI / 180;
      const dLng = (pickupLng - driverLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(driverLat * Math.PI / 180) * Math.cos(pickupLat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distanceToPickup = R * c; // in km
      const distanceToPickupMiles = distanceToPickup * 0.621371;

      // 2. Calculate direction similarity
      let directionScore = 0;
      if (driver.driver_heading) {
        // Driver has a current heading - check if aligned with ride direction
        const driverToPickupLat = pickupLat - driverLat;
        const driverToPickupLng = pickupLng - driverLng;
        const driverToPickupMagnitude = Math.sqrt(driverToPickupLat * driverToPickupLat + driverToPickupLng * driverToPickupLng);

        if (driverToPickupMagnitude > 0 && rideDirMagnitude > 0) {
          // Calculate dot product for direction alignment
          const dotProduct = (driverToPickupLat * rideDirLat + driverToPickupLng * rideDirLng) / 
                           (driverToPickupMagnitude * rideDirMagnitude);
          // Convert to 0-1 scale (1 = same direction, 0 = opposite)
          directionScore = (dotProduct + 1) / 2;
        }
      }

      // 3. Calculate composite score
      // Proximity: closer is better (max 5 miles gets full points)
      const proximityScore = Math.max(0, 1 - (distanceToPickupMiles / 5));
      
      // Driver rating bonus
      const ratingBonus = (driver.driver_rating || 5) / 5;

      // Vehicle type match bonus
      const vehicleTypeMatch = driver.driver_vehicle_info?.vehicle_type === ride.ride_type ? 0.2 : 0;

      // Final score: weighted combination
      const finalScore = (
        proximityScore * 0.5 +      // 50% weight on proximity
        directionScore * 0.25 +      // 25% weight on direction
        ratingBonus * 0.15 +         // 15% weight on rating
        vehicleTypeMatch * 0.1       // 10% weight on vehicle match
      );

      return {
        driver_email: driver.email,
        driver_name: driver.full_name,
        driver_rating: driver.driver_rating || 5,
        driver_vehicle_info: driver.driver_vehicle_info,
        driver_location: driver.driver_location,
        distance_to_pickup_miles: distanceToPickupMiles,
        direction_compatibility: directionScore,
        eta_minutes: Math.round(distanceToPickupMiles / 0.5), // Assume avg 30mph
        score: finalScore
      };
    });

    // Sort by score (highest first)
    scoredDrivers.sort((a, b) => b.score - a.score);

    // Get top 5 matches
    const topMatches = scoredDrivers.slice(0, 5);

    // Notify the best match
    if (topMatches.length > 0) {
      const bestDriver = topMatches[0];
      await base44.asServiceRole.entities.Notification.create({
        user_email: bestDriver.driver_email,
        title: "New Ride Request Nearby!",
        message: `${ride.vehicle_class_details.name} ride • ${bestDriver.distance_to_pickup_miles.toFixed(1)}mi away • ETA ${bestDriver.eta_minutes}min`,
        type: "ride_request",
        data: {
          ride_id: ride.id,
          pickup_address: ride.pickup_address,
          dropoff_address: ride.dropoff_address,
          estimated_fare: ride.fare_breakdown.driver_earnings,
          distance_miles: ride.estimated_distance_miles
        }
      });
    }

    return Response.json({
      success: true,
      matched_drivers: topMatches,
      total_available: availableDrivers.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
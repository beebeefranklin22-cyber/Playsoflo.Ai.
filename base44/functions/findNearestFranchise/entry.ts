import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pickup_coords } = await req.json();

    if (!pickup_coords || pickup_coords.length !== 2) {
      return Response.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Get all active franchises
    const franchises = await base44.asServiceRole.entities.DeliveryFranchise.filter({
      is_active: true
    });

    if (franchises.length === 0) {
      return Response.json({ 
        error: 'No franchises available',
        nearest_franchise: null
      }, { status: 404 });
    }

    // Calculate distances using Haversine formula
    const calculateDistance = (coords1, coords2) => {
      const R = 3959; // Earth radius in miles
      const lat1 = coords1[0] * Math.PI / 180;
      const lat2 = coords2[0] * Math.PI / 180;
      const deltaLat = (coords2[0] - coords1[0]) * Math.PI / 180;
      const deltaLng = (coords2[1] - coords1[1]) * Math.PI / 180;

      const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // Find nearest franchise within service radius
    let nearestFranchise = null;
    let minDistance = Infinity;

    for (const franchise of franchises) {
      if (!franchise.location_coords) continue;

      const distance = calculateDistance(pickup_coords, franchise.location_coords);
      
      if (distance <= franchise.service_radius_miles && distance < minDistance) {
        minDistance = distance;
        nearestFranchise = {
          ...franchise,
          distance_miles: distance.toFixed(2)
        };
      }
    }

    if (!nearestFranchise) {
      // If no franchise in range, assign to closest one anyway
      for (const franchise of franchises) {
        if (!franchise.location_coords) continue;
        const distance = calculateDistance(pickup_coords, franchise.location_coords);
        if (distance < minDistance) {
          minDistance = distance;
          nearestFranchise = {
            ...franchise,
            distance_miles: distance.toFixed(2),
            out_of_range: true
          };
        }
      }
    }

    // Estimate wait time based on active deliveries for this franchise
    const activeOrders = await base44.asServiceRole.entities.DeliveryOrder.filter({
      franchise_id: nearestFranchise?.id,
      status: { $in: ['pending', 'driver_assigned'] }
    });

    const estimatedWaitMinutes = Math.max(5, activeOrders.length * 3);

    return Response.json({ 
      nearest_franchise: nearestFranchise,
      estimated_wait_minutes: estimatedWaitMinutes,
      active_orders_count: activeOrders.length
    });

  } catch (error) {
    console.error('Find franchise error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
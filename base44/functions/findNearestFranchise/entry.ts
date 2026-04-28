import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * findNearestFranchise
 * Returns the 2 nearest franchise locations to the customer,
 * sorted by distance, including full address for display.
 * The first result is the primary (nearest), second is fallback.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customer_coords, customer_address } = await req.json();

    // Must have either coords or an address to geocode
    let coords = customer_coords;

    if (!coords && customer_address) {
      const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
      if (apiKey) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(customer_address)}&key=${apiKey}`;
        const geoRes = await fetch(url);
        const geoData = await geoRes.json();
        if (geoData.status === 'OK' && geoData.results.length > 0) {
          const loc = geoData.results[0].geometry.location;
          coords = [loc.lat, loc.lng];
        }
      }
    }

    if (!coords || coords.length !== 2) {
      return Response.json({ error: 'Could not determine customer location' }, { status: 400 });
    }

    // Get all active franchises
    const franchises = await base44.asServiceRole.entities.DeliveryFranchise.filter({ is_active: true });

    if (franchises.length === 0) {
      return Response.json({
        error: 'No franchises available',
        nearest_franchises: [],
      }, { status: 404 });
    }

    const toRad = d => d * Math.PI / 180;
    const haversine = (c1, c2) => {
      const R = 3959;
      const dLat = toRad(c2[0] - c1[0]);
      const dLon = toRad(c2[1] - c1[1]);
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(c1[0])) * Math.cos(toRad(c2[0])) *
        Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Score all franchises by distance
    const scored = franchises
      .filter(f => f.location_coords && f.location_coords.length === 2)
      .map(f => {
        const dist = haversine(coords, f.location_coords);
        return {
          id: f.id,
          franchise_name: f.franchise_name || f.name,
          address: f.address || f.location_address || f.franchise_address || '',
          phone: f.phone || f.contact_phone || '',
          email: f.owner_email || f.email || '',
          location_coords: f.location_coords,
          service_radius_miles: f.service_radius_miles || 20,
          distance_miles: parseFloat(dist.toFixed(2)),
          within_service_area: dist <= (f.service_radius_miles || 20),
          out_of_range: dist > (f.service_radius_miles || 20),
          // Preserve full franchise data for reference
          franchise_id: f.id,
        };
      })
      .sort((a, b) => a.distance_miles - b.distance_miles);

    // Prefer in-range franchises; fall back to nearest out-of-range
    const inRange = scored.filter(f => f.within_service_area);
    const topTwo = inRange.length > 0
      ? inRange.slice(0, 2)
      : scored.slice(0, 2);

    // Get active order counts for estimated wait time
    const withWaitTimes = await Promise.all(topTwo.map(async (f) => {
      const activeOrders = await base44.asServiceRole.entities.DeliveryOrder.filter({
        franchise_id: f.id,
        status: 'pending',
      });
      return {
        ...f,
        estimated_wait_minutes: Math.max(5, activeOrders.length * 3),
        active_orders_count: activeOrders.length,
      };
    }));

    return Response.json({
      nearest_franchises: withWaitTimes,
      // Convenience: primary = nearest, secondary = second nearest
      primary: withWaitTimes[0] || null,
      secondary: withWaitTimes[1] || null,
      customer_coords: coords,
    });

  } catch (error) {
    console.error('Find franchise error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
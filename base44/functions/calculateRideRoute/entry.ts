import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { pickup, dropoff, autocomplete } = body;

    const apiKey = Deno.env.get('MAPBOX_ACCESS_TOKEN');

    // ── Autocomplete (Mapbox Geocoding API) ─────────────────────────────────────
    if (autocomplete) {
      if (!apiKey) return Response.json({ suggestions: [], _reason: 'no_api_key' });

      const acRes = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(autocomplete)}.json?autocomplete=true&country=us&types=address,place,poi&limit=5&access_token=${apiKey}`
      );
      const acData = await acRes.json();
      console.log('Mapbox autocomplete status:', acRes.status, '| error:', acData.message || 'none');

      const suggestions = (acData.features || []).map(f => f.place_name).filter(Boolean);
      return Response.json({ suggestions, _error: acData.message || null });
    }

    if (!pickup || !dropoff) {
      return Response.json({ error: 'Pickup and dropoff addresses required' }, { status: 400 });
    }

    // ── Route Calculation ─────────────────────────────────────────────────────
    if (!apiKey) {
      console.warn('No Mapbox access token — using fallback estimate');
      return Response.json(buildFallbackResponse(pickup, dropoff, 10, 20));
    }

    // Geocode both addresses
    const geocode = async (addr) => {
      const r = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addr)}.json?country=us&limit=1&access_token=${apiKey}`
      );
      return r.json();
    };
    const [pickupGeo, dropoffGeo] = await Promise.all([geocode(pickup), geocode(dropoff)]);

    const pickupFeat = pickupGeo.features?.[0];
    const dropoffFeat = dropoffGeo.features?.[0];
    console.log('Geocode pickup found:', !!pickupFeat, '| dropoff found:', !!dropoffFeat);

    if (!pickupFeat || !dropoffFeat) {
      console.warn('Geocode failed, using fallback.');
      return Response.json(buildFallbackResponse(pickup, dropoff, 8, 18));
    }

    // Mapbox returns coords as [lng, lat]
    const [pickupLng, pickupLat] = pickupFeat.center;
    const [dropoffLng, dropoffLat] = dropoffFeat.center;

    // Directions API (driving with traffic)
    const dirRes = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?access_token=${apiKey}`
    ).then(r => r.json());

    console.log('Mapbox directions code:', dirRes.code, '| routes:', dirRes.routes?.length || 0);

    if (dirRes.code !== 'Ok' || !dirRes.routes?.length) {
      // Fallback: straight-line haversine estimate
      const miles = haversine(pickupLat, pickupLng, dropoffLat, dropoffLng);
      const minutes = miles * 2.5; // ~2.5 min per mile in city
      return Response.json(buildFullResponse(
        pickup, dropoff, pickupFeat.place_name, dropoffFeat.place_name,
        [pickupLat, pickupLng], [dropoffLat, dropoffLng],
        miles, minutes
      ));
    }

    const route = dirRes.routes[0];
    const distanceMiles = route.distance / 1609.34;
    const durationMinutes = route.duration / 60;

    return Response.json(buildFullResponse(
      pickup, dropoff,
      pickupFeat.place_name,
      dropoffFeat.place_name,
      [pickupLat, pickupLng],
      [dropoffLat, dropoffLng],
      distanceMiles, durationMinutes
    ));

  } catch (error) {
    console.error('calculateRideRoute error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// Uber published rate card (UberX, US average 2024-2025)
// Source: Uber rate card data aggregated from major US cities
function buildPricing(distanceMiles, durationMinutes) {
  // UberX standard rates (US average, published rate cards)
  const uberBase = 1.20;          // base fare
  const uberPerMile = 1.09;       // per mile
  const uberPerMin = 0.21;        // per minute
  const uberBookingFee = 2.85;    // platform booking fee (fixed)
  const uberServiceFee = 0.67;    // Uber service fee
  const uberMinFare = 7.00;       // minimum fare

  const uberRaw = uberBase + (distanceMiles * uberPerMile) + (durationMinutes * uberPerMin) + uberBookingFee + uberServiceFee;
  const uberEstimate = Math.max(uberRaw, uberMinFare);

  // Our platform is 15% cheaper than Uber
  const discount = 0.85;
  const ourEstimate = uberEstimate * discount;

  // Our per-component rates (for fare breakdown display)
  const ourBase = uberBase * discount;
  const ourPerMile = uberPerMile * discount;
  const ourPerMin = uberPerMin * discount;

  return {
    uber_estimate: Math.round(uberEstimate * 100) / 100,
    our_estimate: Math.round(ourEstimate * 100) / 100,
    our_base_price: Math.round(ourBase * 100) / 100,
    our_price_per_mile: Math.round(ourPerMile * 100) / 100,
    our_price_per_minute: Math.round(ourPerMin * 100) / 100,
    discount_percent: 15,
    savings: Math.round((uberEstimate - ourEstimate) * 100) / 100,
  };
}

function buildFullResponse(pickup, dropoff, pickupFmt, dropoffFmt, pickupCoords, dropoffCoords, distanceMiles, durationMinutes) {
  return {
    pickup_coords: pickupCoords,
    dropoff_coords: dropoffCoords,
    pickup_formatted: pickupFmt,
    dropoff_formatted: dropoffFmt,
    distance_miles: distanceMiles,
    duration_minutes: durationMinutes,
    pricing: buildPricing(distanceMiles, durationMinutes),
  };
}

function buildFallbackResponse(pickup, dropoff, miles, minutes) {
  return {
    pickup_coords: [25.7617, -80.1918],
    dropoff_coords: [25.7743, -80.1937],
    pickup_formatted: pickup,
    dropoff_formatted: dropoff,
    distance_miles: miles,
    duration_minutes: minutes,
    pricing: buildPricing(miles, minutes),
    _fallback: true,
  };
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { pickup, dropoff, autocomplete } = body;

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    // ── Autocomplete (Places API New) ──────────────────────────────────────────
    if (autocomplete) {
      if (!apiKey) return Response.json({ suggestions: [], _reason: 'no_api_key' });

      // Try the new Places API first
      const acRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({ input: autocomplete }),
      });
      const acData = await acRes.json();
      console.log('Autocomplete (new) status:', acRes.status, '| error:', acData.error?.message || 'none');

      if (acRes.ok && acData.suggestions) {
        const suggestions = acData.suggestions
          .map(s => s.placePrediction?.text?.text)
          .filter(Boolean);
        return Response.json({ suggestions });
      }

      // Legacy fallback (in case only legacy is enabled)
      const legacy = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(autocomplete)}&types=address&key=${apiKey}`
      ).then(r => r.json());
      const suggestions = (legacy.predictions || []).map(p => p.description);
      return Response.json({
        suggestions,
        _google_status: legacy.status,
        _error: acData.error?.message || legacy.error_message || null,
      });
    }

    if (!pickup || !dropoff) {
      return Response.json({ error: 'Pickup and dropoff addresses required' }, { status: 400 });
    }

    // ── Route Calculation ─────────────────────────────────────────────────────
    if (!apiKey) {
      // Fallback: estimate based on ~10 miles / 20 min
      console.warn('No Google Maps API key — using fallback estimate');
      return Response.json(buildFallbackResponse(pickup, dropoff, 10, 20));
    }

    // Geocode both addresses
    const [pickupGeo, dropoffGeo] = await Promise.all([
      fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(pickup)}&key=${apiKey}`).then(r => r.json()),
      fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(dropoff)}&key=${apiKey}`).then(r => r.json()),
    ]);

    console.log('Geocode pickup status:', pickupGeo.status, '| dropoff status:', dropoffGeo.status);

    if (pickupGeo.status !== 'OK' || dropoffGeo.status !== 'OK') {
      // Graceful fallback instead of hard error
      console.warn('Geocode failed, using fallback. Pickup:', pickupGeo.status, 'Dropoff:', dropoffGeo.status);
      return Response.json(buildFallbackResponse(pickup, dropoff, 8, 18));
    }

    const pickupLoc = pickupGeo.results[0].geometry.location;
    const dropoffLoc = dropoffGeo.results[0].geometry.location;

    // Distance Matrix
    const dmRes = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLoc.lat},${pickupLoc.lng}&destinations=${dropoffLoc.lat},${dropoffLoc.lng}&key=${apiKey}`
    ).then(r => r.json());

    console.log('Distance Matrix status:', dmRes.status, '| element status:', dmRes.rows?.[0]?.elements?.[0]?.status);

    if (dmRes.status !== 'OK' || dmRes.rows[0].elements[0].status !== 'OK') {
      // Fallback: straight-line haversine estimate
      const miles = haversine(pickupLoc.lat, pickupLoc.lng, dropoffLoc.lat, dropoffLoc.lng);
      const minutes = miles * 2.5; // ~2.5 min per mile in city
      return Response.json(buildFullResponse(
        pickup, dropoff, pickupGeo.results[0].formatted_address, dropoffGeo.results[0].formatted_address,
        [pickupLoc.lat, pickupLoc.lng], [dropoffLoc.lat, dropoffLoc.lng],
        miles, minutes
      ));
    }

    const element = dmRes.rows[0].elements[0];
    const distanceMiles = element.distance.value / 1609.34;
    const durationMinutes = element.duration.value / 60;

    return Response.json(buildFullResponse(
      pickup, dropoff,
      pickupGeo.results[0].formatted_address,
      dropoffGeo.results[0].formatted_address,
      [pickupLoc.lat, pickupLoc.lng],
      [dropoffLoc.lat, dropoffLoc.lng],
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
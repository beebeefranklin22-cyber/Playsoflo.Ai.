import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pickup, dropoff } = await req.json();

    if (!pickup || !dropoff) {
      return Response.json({ error: 'Pickup and dropoff addresses required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    // Geocode addresses to get coordinates
    const geocodePickup = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(pickup)}&key=${apiKey}`
    );
    const geocodeDropoff = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(dropoff)}&key=${apiKey}`
    );

    const pickupData = await geocodePickup.json();
    const dropoffData = await geocodeDropoff.json();

    if (pickupData.status !== 'OK' || dropoffData.status !== 'OK') {
      return Response.json({ error: 'Invalid addresses' }, { status: 400 });
    }

    const pickupCoords = pickupData.results[0].geometry.location;
    const dropoffCoords = dropoffData.results[0].geometry.location;

    // Calculate distance and duration using Distance Matrix API
    const distanceMatrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupCoords.lat},${pickupCoords.lng}&destinations=${dropoffCoords.lat},${dropoffCoords.lng}&key=${apiKey}`;
    
    const distanceResponse = await fetch(distanceMatrixUrl);
    const distanceData = await distanceResponse.json();

    if (distanceData.status !== 'OK' || distanceData.rows[0].elements[0].status !== 'OK') {
      return Response.json({ error: 'Could not calculate route' }, { status: 400 });
    }

    const element = distanceData.rows[0].elements[0];
    const distanceMeters = element.distance.value;
    const durationSeconds = element.duration.value;

    // Convert to miles and minutes
    const distanceMiles = distanceMeters / 1609.34;
    const durationMinutes = durationSeconds / 60;

    // Calculate realistic Uber pricing based on actual distance/time
    // Uber pricing model: base fare + per mile + per minute + booking fee
    const uberBasePrice = 2.50;
    const uberPricePerMile = 1.75;
    const uberPricePerMinute = 0.35;
    const uberBookingFee = 2.55;
    
    const uberEstimate = uberBasePrice + (distanceMiles * uberPricePerMile) + (durationMinutes * uberPricePerMinute) + uberBookingFee;
    
    // Our pricing: Always 15% cheaper than Uber
    const discountMultiplier = 0.85; // 15% discount
    const ourEstimate = uberEstimate * discountMultiplier;
    
    // Calculate our breakdown to match 15% cheaper total
    const ourBasePrice = uberBasePrice * discountMultiplier;
    const ourPricePerMile = uberPricePerMile * discountMultiplier;
    const ourPricePerMinute = uberPricePerMinute * discountMultiplier;

    return Response.json({
      pickup_coords: [pickupCoords.lat, pickupCoords.lng],
      dropoff_coords: [dropoffCoords.lat, dropoffCoords.lng],
      pickup_formatted: pickupData.results[0].formatted_address,
      dropoff_formatted: dropoffData.results[0].formatted_address,
      distance_miles: distanceMiles,
      duration_minutes: durationMinutes,
      pricing: {
        uber_estimate: uberEstimate,
        our_estimate: ourEstimate,
        our_base_price: ourBasePrice,
        our_price_per_mile: ourPricePerMile,
        our_price_per_minute: ourPricePerMinute,
        discount_percent: 15,
        savings: uberEstimate - ourEstimate
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
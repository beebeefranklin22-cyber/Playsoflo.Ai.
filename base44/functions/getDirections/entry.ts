import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Geocode address to coordinates using Nominatim (free, no API key)
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'PlaySoFloApp/1.0' }
  });
  const data = await response.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { origin, destination, mode = 'driving' } = body || {};

    if (!origin || !destination) {
      return Response.json({ error: 'Origin and destination required' }, { status: 400 });
    }

    // Convert addresses to coordinates
    let originCoords = typeof origin === 'string' ? await geocodeAddress(origin) : origin;
    let destCoords = typeof destination === 'string' ? await geocodeAddress(destination) : destination;

    if (!originCoords || !destCoords) {
      return Response.json({ error: 'Could not geocode addresses' }, { status: 400 });
    }

    // Call OSRM API (free, no API key needed)
    const url = `https://router.project-osrm.org/route/v1/driving/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&steps=true&geometries=polyline`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok') {
      return Response.json({ error: 'Routing failed', details: data.code }, { status: 400 });
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    // Convert distance and duration to human-readable format
    const distanceKm = route.distance / 1000;
    const distanceMiles = distanceKm * 0.621371;
    const durationMins = Math.round(route.duration / 60);
    const durationHours = Math.floor(durationMins / 60);
    const durationRemainingMins = durationMins % 60;

    return Response.json({
      distance: {
        text: distanceMiles < 1 ? `${Math.round(distanceMiles * 5280)} ft` : `${distanceMiles.toFixed(1)} mi`,
        meters: route.distance,
        miles: distanceMiles.toFixed(2)
      },
      duration: {
        text: durationHours > 0 ? `${durationHours} hour${durationHours > 1 ? 's' : ''} ${durationRemainingMins} min` : `${durationMins} min`,
        seconds: route.duration,
        minutes: durationMins
      },
      duration_in_traffic: null,
      start_location: { lat: originCoords.lat, lng: originCoords.lng },
      end_location: { lat: destCoords.lat, lng: destCoords.lng },
      steps: leg.steps.map(step => ({
        instruction: step.maneuver.type === 'depart' ? 'Head ' + step.maneuver.modifier :
                     step.maneuver.type === 'arrive' ? 'Arrive at destination' :
                     step.maneuver.type === 'turn' ? `Turn ${step.maneuver.modifier}` :
                     step.maneuver.type === 'merge' ? `Merge ${step.maneuver.modifier || ''}` :
                     step.maneuver.type.replace(/-/g, ' '),
        distance: step.distance < 1000 ? `${Math.round(step.distance)} m` : `${(step.distance / 1000).toFixed(1)} km`,
        duration: `${Math.round(step.duration / 60)} min`,
        start_location: { lat: step.maneuver.location[1], lng: step.maneuver.location[0] },
        end_location: { lat: step.maneuver.location[1], lng: step.maneuver.location[0] },
        maneuver: step.maneuver.type
      })),
      polyline: route.geometry,
      bounds: {
        northeast: { lat: Math.max(originCoords.lat, destCoords.lat), lng: Math.max(originCoords.lng, destCoords.lng) },
        southwest: { lat: Math.min(originCoords.lat, destCoords.lat), lng: Math.min(originCoords.lng, destCoords.lng) }
      },
      traffic_speed_entry: []
    });
  } catch (error) {
    console.error('Directions error:', error);
    return Response.json({ 
      error: 'Failed to get directions',
      details: error.message 
    }, { status: 500 });
  }
});
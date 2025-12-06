import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

    // Validate coordinates if objects are passed
    if (typeof origin === 'object' && (origin.lat == null || origin.lng == null)) {
      return Response.json({ error: 'Invalid origin coordinates' }, { status: 400 });
    }
    if (typeof destination === 'object' && (destination.lat == null || destination.lng == null)) {
      return Response.json({ error: 'Invalid destination coordinates' }, { status: 400 });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    // Call Google Directions API
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.append('origin', typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`);
    url.searchParams.append('destination', typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`);
    url.searchParams.append('mode', mode);
    url.searchParams.append('departure_time', 'now');
    url.searchParams.append('traffic_model', 'best_guess');
    url.searchParams.append('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      return Response.json({ 
        error: 'Directions request failed', 
        details: data.status 
      }, { status: 400 });
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    return Response.json({
      distance: {
        text: leg.distance.text,
        meters: leg.distance.value,
        miles: (leg.distance.value / 1609.34).toFixed(2)
      },
      duration: {
        text: leg.duration.text,
        seconds: leg.duration.value,
        minutes: Math.round(leg.duration.value / 60)
      },
      duration_in_traffic: leg.duration_in_traffic ? {
        text: leg.duration_in_traffic.text,
        seconds: leg.duration_in_traffic.value,
        minutes: Math.round(leg.duration_in_traffic.value / 60)
      } : null,
      start_location: leg.start_location,
      end_location: leg.end_location,
      steps: leg.steps.map(step => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
        distance: step.distance.text,
        duration: step.duration.text,
        start_location: step.start_location,
        end_location: step.end_location,
        maneuver: step.maneuver
      })),
      polyline: route.overview_polyline.points,
      bounds: route.bounds,
      traffic_speed_entry: route.legs[0].traffic_speed_entry || []
    });
  } catch (error) {
    console.error('Directions error:', error);
    return Response.json({ 
      error: 'Failed to get directions',
      details: error.message 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { lat, lng, zones } = body || {};

    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      return Response.json({ error: 'Valid location coordinates required' }, { status: 400 });
    }

    // Predefined geofenced zones (airports, special areas, etc.)
    const geofencedZones = zones || [
      {
        id: 'miami_airport',
        name: 'Miami International Airport',
        center: { lat: 25.7959, lng: -80.2870 },
        radius: 3000, // meters
        type: 'airport',
        rules: {
          pickup_fee: 5.00,
          dropoff_fee: 3.00,
          waiting_area_required: true,
          message: 'Airport pickup - follow signs to rideshare area'
        }
      },
      {
        id: 'south_beach',
        name: 'South Beach Entertainment District',
        center: { lat: 25.7907, lng: -80.1300 },
        radius: 2000,
        type: 'entertainment',
        rules: {
          surge_pricing: 1.5,
          peak_hours: ['22:00-04:00'],
          message: 'High demand area - surge pricing may apply'
        }
      },
      {
        id: 'downtown_miami',
        name: 'Downtown Miami',
        center: { lat: 25.7617, lng: -80.1918 },
        radius: 2500,
        type: 'business',
        rules: {
          no_stopping_zones: true,
          message: 'Use designated pickup/dropoff zones only'
        }
      }
    ];

    // Calculate distance to each zone using Haversine formula
    const isInZone = (pointLat, pointLng, zoneLat, zoneLng, radiusMeters) => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = pointLat * Math.PI / 180;
      const φ2 = zoneLat * Math.PI / 180;
      const Δφ = (zoneLat - pointLat) * Math.PI / 180;
      const Δλ = (zoneLng - pointLng) * Math.PI / 180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      const distance = R * c;
      return distance <= radiusMeters;
    };

    const matchedZones = geofencedZones.filter(zone => 
      isInZone(lat, lng, zone.center.lat, zone.center.lng, zone.radius)
    );

    return Response.json({
      in_geofenced_area: matchedZones.length > 0,
      zones: matchedZones,
      location: { lat, lng }
    });
  } catch (error) {
    console.error('Geofence check error:', error);
    return Response.json({ 
      error: 'Failed to check geofence',
      details: error.message 
    }, { status: 500 });
  }
});
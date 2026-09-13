// api/geo.js — free, keyless geocoding via OpenStreetMap Nominatim. Backs
// calculateRideRoute (src/functions/calculateRideRoute.js), which HailRideModal.jsx
// calls for address autocomplete and fare/distance estimation. No Google
// Maps or Mapbox key is configured for this project (getGoogleMapsKey() was
// a hardcoded "YOUR_API_KEY" placeholder), so this runs server-side against
// Nominatim's public search API instead of leaving the feature broken.
// Nominatim's usage policy caps this at ~1 request/second and requires an
// identifying User-Agent header, which browsers refuse to let fetch() set —
// hence a server endpoint rather than a direct client call.
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'PlaySoFlo/1.0 (ride-hailing route estimation; contact: support@playsoflo.com)';

// Straight-line distance gets a road-distance fudge factor (real driving
// routes are rarely a straight line), plus an average-city-speed duration
// estimate — the same style of keyless fallback src/functions/calculateDeliveryPrice.js
// already uses. This is only ever a fare *preview*: the real charge is
// recomputed server-side from the selected vehicle's rate card and the
// actual distance/duration when the ride is requested (api/rides.js's priceRide()).
const ROAD_DISTANCE_FACTOR = 1.3;
const AVG_SPEED_MPH = 22;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { action } = req.body || {};

  try {
    if (action === 'autocomplete') return res.status(200).json(await autocomplete(req.body));
    if (action === 'route') return res.status(200).json(await route(req.body));
    if (action === 'reverse') return res.status(200).json(await reverse(req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('geo error:', action, err);
    return res.status(200).json({ error: err.message });
  }
}

async function nominatimSearch(query, limit) {
  const url = `${NOMINATIM_BASE}/search?format=jsonv2&limit=${limit}&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } });
  if (!response.ok) throw new Error('Geocoding service unavailable');
  return response.json();
}

async function geocode(query) {
  const results = await nominatimSearch(query, 1);
  if (!results.length) return null;
  const best = results[0];
  return { lat: Number(best.lat), lon: Number(best.lon), formatted: best.display_name };
}

async function autocomplete({ autocomplete: query }) {
  const trimmed = (query || '').trim();
  if (trimmed.length < 3) return { suggestions: [] };
  const results = await nominatimSearch(trimmed, 5).catch(() => []);
  return { suggestions: results.map((r) => r.display_name) };
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function route({ pickup, dropoff }) {
  if (!pickup || !dropoff) return { error: 'pickup and dropoff are required' };

  const [from, to] = await Promise.all([geocode(pickup), geocode(dropoff)]);
  if (!from) return { error: `Could not locate "${pickup}"` };
  if (!to) return { error: `Could not locate "${dropoff}"` };

  const straightLineMiles = haversineMiles(from.lat, from.lon, to.lat, to.lon);
  const distance_miles = Math.round(straightLineMiles * ROAD_DISTANCE_FACTOR * 10) / 10;
  const duration_minutes = Math.max(3, Math.round((distance_miles / AVG_SPEED_MPH) * 60));

  return {
    distance_miles,
    duration_minutes,
    pickup_coords: [from.lat, from.lon],
    dropoff_coords: [to.lat, to.lon],
    pickup_formatted: from.formatted,
    dropoff_formatted: to.formatted,
    // Matches VehicleTypeSelector.jsx's own DEFAULT_BASE rate card — this is
    // just the preview shown before a vehicle type is picked.
    pricing: { our_base_price: 2.5, our_price_per_mile: 1.49, our_price_per_minute: 0.3 },
  };
}

async function reverse({ lat, lon }) {
  if (lat == null || lon == null) return { error: 'lat and lon are required' };
  const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } });
  if (!response.ok) return { error: 'Reverse geocoding failed' };
  const data = await response.json();
  return { formatted_address: data.display_name || null };
}

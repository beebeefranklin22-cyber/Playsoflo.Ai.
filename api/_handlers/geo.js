// api/geo.js — free, keyless geocoding via OpenStreetMap Nominatim, plus
// (for the `directions` action) real turn-by-turn routing via the Google
// Maps Directions API. Backs calculateRideRoute (src/functions/calculateRideRoute.js),
// which HailRideModal.jsx calls for address autocomplete and fare/distance
// estimation. No Google Maps or Mapbox key is configured for THAT feature
// (getGoogleMapsKey() was a hardcoded "YOUR_API_KEY" placeholder), so it
// runs server-side against Nominatim's public search API instead of
// leaving the feature broken. Nominatim's usage policy caps this at ~1
// request/second and requires an identifying User-Agent header, which
// browsers refuse to let fetch() set — hence a server endpoint rather than
// a direct client call.
import { requireUser } from '../_lib/auth.js';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'PlaySoFlo/1.0 (ride-hailing route estimation; contact: support@playsoflo.com)';
const GOOGLE_DIRECTIONS_BASE = 'https://maps.googleapis.com/maps/api/directions/json';

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
    if (action === 'directions') {
      // Real driving directions cost real money per request (unlike the
      // free Nominatim actions above), so this one requires a signed-in
      // caller to keep an anonymous script from running up the bill.
      try {
        await requireUser(req);
      } catch (err) {
        return res.status(err.statusCode || 401).json({ error: err.message });
      }
      return res.status(200).json(await directions(req.body));
    }
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
  // Return each suggestion's own lat/lon alongside its display text, not
  // just the text -- re-searching a display_name later (as route() used to
  // do for every pickup/dropoff) is a lossy round trip through Nominatim's
  // free-text search and can match a coarser result (e.g. the street
  // instead of the exact house-number address point), silently dropping
  // the street number the user actually picked. Capturing coordinates at
  // selection time avoids re-geocoding the text at all.
  return {
    suggestions: results.map((r) => ({ display_name: r.display_name, lat: Number(r.lat), lon: Number(r.lon) })),
  };
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function route({ pickup, dropoff, pickup_coords, dropoff_coords }) {
  if (!pickup || !dropoff) return { error: 'pickup and dropoff are required' };

  // If the caller already has precise coordinates (the user picked an
  // autocomplete suggestion or "use current location"), use those directly
  // instead of re-geocoding the address text -- see the comment in
  // autocomplete() for why re-searching that text is lossy. The address
  // text itself is echoed back unchanged rather than replaced with a fresh
  // (potentially coarser) geocoded version.
  const [from, to] = await Promise.all([
    Array.isArray(pickup_coords) ? { lat: pickup_coords[0], lon: pickup_coords[1], formatted: pickup } : geocode(pickup),
    Array.isArray(dropoff_coords) ? { lat: dropoff_coords[0], lon: dropoff_coords[1], formatted: dropoff } : geocode(dropoff),
  ]);
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

// Strips the <b>/<div> markup Google puts in html_instructions to make a
// plain string suitable for on-screen display and for the app's
// text-to-speech turn announcements.
function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toLatLngParam(coords) {
  if (Array.isArray(coords) && coords.length === 2) return `${coords[0]},${coords[1]}`;
  if (coords && typeof coords === 'object' && 'lat' in coords) return `${coords.lat},${coords.lng ?? coords.lon}`;
  return null;
}

// Real turn-by-turn driving directions via the Google Maps Directions API
// -- used by NavigationModal.jsx, LiveGPSTracking.jsx, RideTrackingMap.jsx,
// and RonronAI.jsx for driver navigation. This used to be referenced as
// base44.functions.invoke('getDirections', ...) with no backend behind it
// at all, so navigation never worked. The response shape here deliberately
// mirrors Google's own Directions API response (bounds, step
// start_location/end_location, distance/duration as {text, value} objects)
// because the client's polyline decoder and map-bounds logic were already
// written against that exact shape -- only `instruction` (plain text, for
// display and voice) and `.minutes` (on each duration object, since the
// client reads duration.minutes) are added on top.
async function directions({ origin, destination, mode }) {
  const originParam = toLatLngParam(origin);
  const destinationParam = toLatLngParam(destination);
  if (!originParam || !destinationParam) return { error: 'origin and destination ([lat, lng]) are required' };

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    const err = new Error('Turn-by-turn directions are not configured yet');
    err.statusCode = 503;
    throw err;
  }

  const url = `${GOOGLE_DIRECTIONS_BASE}?origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destinationParam)}` +
    `&mode=${encodeURIComponent(mode || 'driving')}&departure_time=now&key=${key}`;
  const response = await fetch(url);
  if (!response.ok) return { error: `Directions service unavailable (${response.status})` };
  const data = await response.json();

  if (data.status !== 'OK') {
    return { error: data.error_message || `Could not find a route (${data.status})` };
  }

  const route = data.routes[0];
  const leg = route.legs[0];
  const withMinutes = (d) => (d ? { ...d, minutes: Math.round(d.value / 60) } : null);

  return {
    polyline: route.overview_polyline?.points,
    bounds: route.bounds,
    distance: leg.distance,
    duration: withMinutes(leg.duration),
    duration_in_traffic: withMinutes(leg.duration_in_traffic),
    steps: (leg.steps || []).map((step) => ({
      ...step,
      instruction: stripHtml(step.html_instructions),
      distance: step.distance,
      duration: withMinutes(step.duration),
    })),
  };
}

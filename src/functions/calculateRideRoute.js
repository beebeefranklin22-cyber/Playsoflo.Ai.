// calculateRideRoute — referenced by HailRideModal.jsx (address autocomplete
// and fare/distance estimation) but never implemented anywhere, which
// silently broke ride-hailing end to end: distance/duration stayed null, so
// the Payment modal (which requires both) could never open. Backed by
// api/geo.js's keyless Nominatim geocoding, since no Google/Mapbox key is
// configured for this project.
export async function calculateRideRoute(args = {}) {
  try {
    const action = args.autocomplete !== undefined ? 'autocomplete' : 'route';
    const response = await fetch('/api/geo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...args }),
    });
    const data = await response.json();
    return { data };
  } catch (error) {
    return { data: { error: error.message } };
  }
}

// No geofence zones have been defined anywhere in this app (no zones
// table, no admin UI to draw one) — this always reports "not in any zone"
// rather than fabricating zone data. Wire this up to a real zones table
// once that feature exists.
export async function checkGeofence() {
  return { data: { in_geofenced_area: false, zones: [] } };
}

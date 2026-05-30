// Geo helpers for radius-based matching of drivers to nearby requests.

// Normalize coords that may be stored as [lat, lng] array or {lat, lng} / {latitude, longitude} object.
export function toLatLng(coords) {
  if (!coords) return null;
  if (Array.isArray(coords) && coords.length >= 2) {
    const [lat, lng] = coords;
    if (typeof lat === "number" && typeof lng === "number") return [lat, lng];
    return null;
  }
  if (typeof coords === "object") {
    const lat = coords.lat ?? coords.latitude;
    const lng = coords.lng ?? coords.longitude;
    if (typeof lat === "number" && typeof lng === "number") return [lat, lng];
  }
  return null;
}

// Distance in miles between two points using the Haversine formula.
export function distanceInMiles(a, b) {
  const p1 = toLatLng(a);
  const p2 = toLatLng(b);
  if (!p1 || !p2) return null;
  const R = 3959; // Earth radius in miles
  const lat1 = (p1[0] * Math.PI) / 180;
  const lat2 = (p2[0] * Math.PI) / 180;
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

// Default radius (miles) a driver will see requests within.
export const DEFAULT_DRIVER_RADIUS_MILES = 30;

/**
 * Filter requests to only those whose pickup is within `radius` miles of the driver,
 * annotate each with `distance_to_pickup`, and sort closest-first.
 * - driverLocation: [lat, lng] | {lat,lng}
 * - getPickup: function(request) => coords for that request's pickup
 * If driverLocation is missing, returns requests unchanged (can't compute radius).
 */
export function filterNearbyRequests(requests, driverLocation, getPickup, radius = DEFAULT_DRIVER_RADIUS_MILES) {
  if (!driverLocation || !Array.isArray(requests)) return requests || [];
  return requests
    .map((r) => {
      const dist = distanceInMiles(driverLocation, getPickup(r));
      return { ...r, distance_to_pickup: dist };
    })
    .filter((r) => r.distance_to_pickup !== null && r.distance_to_pickup <= radius)
    .sort((a, b) => a.distance_to_pickup - b.distance_to_pickup);
}
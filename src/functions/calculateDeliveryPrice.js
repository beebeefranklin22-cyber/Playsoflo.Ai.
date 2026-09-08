// Straight-line (haversine) distance pricing — no Google Maps/geocoding
// key configured yet. This is the same fallback formula already used
// elsewhere in the app (UnifiedBookingModal's delivery fee estimate):
// a flat base fee plus $1.25/mile. Real driving-distance-based pricing
// needs a maps key; this keeps the feature usable in the meantime rather
// than hard-failing.
const BASE_FEE = 3.99;
const PER_MILE = 1.25;
const URGENCY_MULTIPLIER = { normal: 1, urgent: 1.5, same_day: 1.25 };

function haversineMiles([lat1, lon1], [lat2, lon2]) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function calculateDeliveryPrice({ pickup_coords, delivery_coords, urgency_level } = {}) {
  if (!pickup_coords || !delivery_coords) {
    return { data: { error: 'pickup_coords and delivery_coords are required' } };
  }

  const distance_miles = Math.round(haversineMiles(pickup_coords, delivery_coords) * 10) / 10;
  const multiplier = URGENCY_MULTIPLIER[urgency_level] || 1;
  const base_price = Math.round(BASE_FEE * multiplier * 100) / 100;
  const distance_fee = Math.round(distance_miles * PER_MILE * 100) / 100;
  const total_price = Math.round((base_price + distance_fee) * 100) / 100;

  return {
    data: {
      pricing: { base_price, distance_miles, distance_fee, total_price },
    },
  };
}

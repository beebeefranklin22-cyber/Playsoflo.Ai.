// Gateway function — combines property-booking.js, car-rental.js, and
// car-damage.js. See api/money.js for why these are grouped (Vercel
// Hobby plan's 12-function cap).
import propertyBooking from './_handlers/property-booking.js';
import carRental from './_handlers/car-rental.js';
import carDamage from './_handlers/car-damage.js';

const ROUTES = {
  'property-booking': propertyBooking,
  'car-rental': carRental,
  'car-damage': carDamage,
};

export default async function handler(req, res) {
  const target = ROUTES[req.query.__fn];
  if (!target) return res.status(404).json({ error: 'Unknown endpoint' });
  return target(req, res);
}

import { callSecureApi } from '@/lib/apiClient';

// Live flight search via Duffel (api/_handlers/flights.js). Requires
// DUFFEL_API_KEY to be configured on the server -- returns a 503 with a
// clear message until it is.
export async function searchFlights({ origin, destination, departure_date, return_date, adult_count, cabin_class } = {}) {
  try {
    const data = await callSecureApi('/api/flights', {
      action: 'search',
      origin,
      destination,
      departure_date,
      return_date,
      adult_count,
      cabin_class,
    });
    return { data };
  } catch (error) {
    return { data: { success: false, error: error.message } };
  }
}

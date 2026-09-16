import { callSecureApi } from '@/lib/apiClient';

// City/airport name search (e.g. "Miami" -> MIA) via Duffel's real places
// suggestions endpoint, so users never have to already know an IATA code.
export async function searchFlightPlaces({ query } = {}) {
  try {
    const data = await callSecureApi('/api/flights', { action: 'search_places', query });
    return { data };
  } catch (error) {
    return { data: { success: false, error: error.message, places: [] } };
  }
}

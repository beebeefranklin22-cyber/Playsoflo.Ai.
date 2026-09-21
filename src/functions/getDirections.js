import { getAuthHeaders } from '@/lib/apiClient';

// getDirections — referenced by NavigationModal.jsx, LiveGPSTracking.jsx,
// RideTrackingMap.jsx, and RonronAI.jsx for driver turn-by-turn navigation,
// but never implemented, so navigation never worked. Backed by api/geo.js's
// `directions` action (real Google Maps Directions API calls, gated behind
// GOOGLE_MAPS_API_KEY). Every call site already wraps this in its own
// try/catch and checks response.data.error, so this always resolves with
// {data: ...} rather than throwing, matching calculateRideRoute.js's
// sibling action in the same handler.
export async function getDirections(args = {}) {
  try {
    const response = await fetch('/api/geo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ action: 'directions', ...args }),
    });
    const data = await response.json();
    return { data };
  } catch (error) {
    return { data: { error: error.message } };
  }
}

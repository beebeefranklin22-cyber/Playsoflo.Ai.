import { callSecureApi } from '@/lib/apiClient';

// Fetches the full offer (with available baggage/cancel-for-any-reason
// services) plus seat maps -- the two inputs the real Duffel Ancillaries
// component needs, per its current (non-deprecated) usage.
export async function getFlightOfferDetails({ offer_id } = {}) {
  try {
    const data = await callSecureApi('/api/flights', { action: 'get_offer_details', offer_id });
    return { data };
  } catch (error) {
    return { data: { success: false, error: error.message } };
  }
}

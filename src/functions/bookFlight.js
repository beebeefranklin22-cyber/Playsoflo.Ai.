import { callSecureApi } from '@/lib/apiClient';

// Charges the signed-in user's wallet and creates a real Duffel order.
// The server re-fetches the offer and re-verifies its price before
// charging anyone -- never trust offer_id/price round-tripped from a
// prior search response as still valid.
export async function bookFlight({ offer_id, passengers, contact_email, contact_phone } = {}) {
  try {
    const data = await callSecureApi('/api/flights', {
      action: 'book',
      offer_id,
      passengers,
      contact_email,
      contact_phone,
    });
    return { data };
  } catch (error) {
    return { data: { success: false, error: error.message } };
  }
}

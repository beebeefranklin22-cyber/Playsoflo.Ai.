import { callSecureApi } from '@/lib/apiClient';

export async function cancelCarRentalSecure({ rental_id, reason } = {}) {
  try {
    const data = await callSecureApi('/api/car-rental', { action: 'cancel', rental_id, reason });
    return { data };
  } catch (error) {
    return { data: { error: error.message } };
  }
}

import { callSecureApi } from '@/lib/apiClient';

export async function completeRideSecure({ ride_id } = {}) {
  try {
    const data = await callSecureApi('/api/rides', { action: 'complete', ride_id });
    return { data };
  } catch (error) {
    return { data: { error: error.message } };
  }
}

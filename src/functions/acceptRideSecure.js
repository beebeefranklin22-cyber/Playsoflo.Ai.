import { callSecureApi } from '@/lib/apiClient';

export async function acceptRideSecure({ ride_id } = {}) {
  try {
    const data = await callSecureApi('/api/rides', { action: 'accept', ride_id });
    return { data };
  } catch (error) {
    return { data: { error: error.message } };
  }
}

import { callSecureApi } from '@/lib/apiClient';

export async function matchOptimalDriver({ ride_id } = {}) {
  try {
    const data = await callSecureApi('/api/rides', { action: 'match_driver', ride_id });
    return { data };
  } catch (error) {
    return { data: { matched: false, error: error.message } };
  }
}

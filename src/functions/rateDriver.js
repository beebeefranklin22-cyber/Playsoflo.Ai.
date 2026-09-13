import { callSecureApi } from '@/lib/apiClient';

export async function rateDriver({ ride_id, rating, review } = {}) {
  const data = await callSecureApi('/api/rides', { action: 'rate_driver', ride_id, rating, review });
  return { data };
}

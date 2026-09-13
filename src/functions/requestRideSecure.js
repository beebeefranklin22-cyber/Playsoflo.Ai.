import { callSecureApi } from '@/lib/apiClient';

export async function requestRideSecure(params = {}) {
  const data = await callSecureApi('/api/rides', { action: 'request_ride', ...params });
  return { data };
}

import { callSecureApi } from '@/lib/apiClient';

export async function contributeFanPool(params = {}) {
  const data = await callSecureApi('/api/fan-pool', { action: 'contribute', ...params });
  return { data };
}

import { callSecureApi } from '@/lib/apiClient';

export async function requestMusicDistribution(params = {}) {
  const data = await callSecureApi('/api/music-distribution', { action: 'request', ...params });
  return { data };
}

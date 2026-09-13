import { callSecureApi } from '@/lib/apiClient';

export async function payCarRental(params = {}) {
  const data = await callSecureApi('/api/car-rental', { action: 'pay', ...params });
  return { data };
}

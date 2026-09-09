import { callSecureApi } from '@/lib/apiClient';

export async function respondToSettlement({ settlement_id, response, counter_offer } = {}) {
  const data = await callSecureApi('/api/car-damage', { action: 'respond', settlement_id, response, counter_offer });
  return { data };
}

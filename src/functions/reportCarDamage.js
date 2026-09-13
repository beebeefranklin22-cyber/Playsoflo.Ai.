import { callSecureApi } from '@/lib/apiClient';

export async function reportCarDamage({ rental_id, description, photos, estimated_cost } = {}) {
  const data = await callSecureApi('/api/car-damage', { action: 'report', rental_id, description, photos, estimated_cost });
  return { data };
}

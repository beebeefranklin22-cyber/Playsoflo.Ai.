import { callSecureApi } from '@/lib/apiClient';

export async function completeDelivery({ order_id, new_status, message } = {}) {
  const data = await callSecureApi('/api/delivery', { order_id, new_status, message });
  return { data };
}

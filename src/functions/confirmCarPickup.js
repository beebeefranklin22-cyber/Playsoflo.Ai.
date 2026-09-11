import { callSecureApi } from '@/lib/apiClient';

export async function confirmCarPickup({ rental_id, photos, videos, inspection } = {}) {
  try {
    const data = await callSecureApi('/api/car-rental', { action: 'confirm_pickup', rental_id, photos, videos, inspection });
    return { data };
  } catch (error) {
    return { data: { error: error.message } };
  }
}

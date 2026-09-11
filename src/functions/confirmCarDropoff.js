import { callSecureApi } from '@/lib/apiClient';

export async function confirmCarDropoff({ rental_id, photos, videos, inspection, photo_comparison, new_damages_detected } = {}) {
  try {
    const data = await callSecureApi('/api/car-rental', { action: 'confirm_dropoff', rental_id, photos, videos, inspection, photo_comparison, new_damages_detected });
    return { data };
  } catch (error) {
    return { data: { error: error.message } };
  }
}

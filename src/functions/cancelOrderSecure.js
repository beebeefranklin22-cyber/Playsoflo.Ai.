import { callSecureApi } from '@/lib/apiClient';

export async function cancelOrderSecure({ order_id, cancellation_reason } = {}) {
  try {
    const data = await callSecureApi('/api/bookings', { action: 'cancel_order', order_id, cancellation_reason });
    return { data };
  } catch (error) {
    return { data: { error: error.message } };
  }
}

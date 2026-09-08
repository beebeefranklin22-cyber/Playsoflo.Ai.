import { callSecureApi } from '@/lib/apiClient';

export async function updateBookingStatus({ bookingId, newStatus, reason } = {}) {
  try {
    const data = await callSecureApi('/api/bookings', { action: 'update_status', bookingId, newStatus, reason });
    return { data };
  } catch (error) {
    return { data: { success: false, error: error.message } };
  }
}

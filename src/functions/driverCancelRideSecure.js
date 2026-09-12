import { callSecureApi } from '@/lib/apiClient';

export async function driverCancelRideSecure({ ride_id, cancellation_reason } = {}) {
  try {
    const data = await callSecureApi('/api/rides', { action: 'driver_cancel', ride_id, cancellation_reason });
    return { data };
  } catch (error) {
    return { data: { error: error.message } };
  }
}

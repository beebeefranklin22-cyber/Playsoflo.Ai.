import { callSecureApi } from '@/lib/apiClient';

// Backs the whole property booking lifecycle: request -> (approve|decline)
// -> pay -> confirmed, plus cancel. See api/property-booking.js for the
// full state machine and payment handling.
export async function propertyBooking(params = {}) {
  try {
    const data = await callSecureApi('/api/property-booking', params);
    return { data };
  } catch (error) {
    console.error('propertyBooking error:', error);
    return { data: { error: error.message } };
  }
}

import { callSecureApi } from '@/lib/apiClient';

// Registered under this exact name so base44.functions.invoke('fetchTicketmasterEvents', ...)
// in EntertainmentExperiences.jsx resolves to a real implementation. The
// caller reads result.data?.events with no error check, so this resolves
// with an empty list on failure rather than throwing.
export async function fetchTicketmasterEvents({ keyword, city } = {}) {
  try {
    const data = await callSecureApi('/api/ticketmaster', { keyword, city });
    return { data };
  } catch (error) {
    return { data: { events: [], error: error.message } };
  }
}

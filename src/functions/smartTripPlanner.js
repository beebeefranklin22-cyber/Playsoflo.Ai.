import { callSecureApi } from '@/lib/apiClient';

export async function smartTripPlanner(params = {}) {
  try {
    const data = await callSecureApi('/api/ai-assist', { action: 'trip_planner', ...params });
    return { data };
  } catch (error) {
    return { data: { error: error.message } };
  }
}

import { callSecureApi } from '@/lib/apiClient';

export async function analyzeUserPreferences({ userEmail, userInterests } = {}) {
  try {
    return await callSecureApi('/api/ai-assist', { action: 'user_preferences', userEmail, userInterests });
  } catch (error) {
    return { preferences: null, error: error.message };
  }
}

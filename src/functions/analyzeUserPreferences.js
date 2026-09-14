import { callSecureApi } from '@/lib/apiClient';

// Always analyzes the signed-in caller's own interaction history -- the
// server resolves that from the auth token, not from a userEmail param.
export async function analyzeUserPreferences({ userInterests } = {}) {
  try {
    return await callSecureApi('/api/ai-assist', { action: 'user_preferences', userInterests });
  } catch (error) {
    return { preferences: null, error: error.message };
  }
}

import { callSecureApi } from '@/lib/apiClient';

export async function translateChatMessage({ message, targetLanguage } = {}) {
  try {
    const data = await callSecureApi('/api/ai-assist', { action: 'translate', message, targetLanguage });
    return { data };
  } catch (error) {
    return { data: { success: false, error: error.message } };
  }
}

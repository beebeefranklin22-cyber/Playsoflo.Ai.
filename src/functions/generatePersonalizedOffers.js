import { callSecureApi } from '@/lib/apiClient';

export async function generatePersonalizedOffers() {
  try {
    return await callSecureApi('/api/ai-assist', { action: 'personalized_offers' });
  } catch (error) {
    return { offers: [], error: error.message };
  }
}

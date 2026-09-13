import { callSecureApi } from '@/lib/apiClient';

export async function processCollaborativeRevenue({ purchaseId, contentId, totalAmount } = {}) {
  const data = await callSecureApi('/api/collaborative-revenue', { purchaseId, contentId, totalAmount });
  return { data };
}

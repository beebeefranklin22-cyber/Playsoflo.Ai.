import { callSecureApi } from '@/lib/apiClient';

export async function getAIDisputeResolution({ orderId, disputeReason, userRole } = {}) {
  try {
    const data = await callSecureApi('/api/ai-assist', { action: 'dispute_resolution', orderId, disputeReason, userRole });
    return { data };
  } catch (error) {
    return { data: { success: false, error: error.message } };
  }
}

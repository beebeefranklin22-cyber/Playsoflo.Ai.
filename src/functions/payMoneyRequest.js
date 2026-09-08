import { callSecureApi } from '@/lib/apiClient';

// Pays a pending PaymentRequest (the signed-in user must be its payer).
export async function payMoneyRequest({ request_id } = {}) {
  try {
    const data = await callSecureApi('/api/wallet', { action: 'pay_request', request_id });
    return { data };
  } catch (error) {
    console.error('payMoneyRequest error:', error);
    return { data: { success: false, error: error.message } };
  }
}

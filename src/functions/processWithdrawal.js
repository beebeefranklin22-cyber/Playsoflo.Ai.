import { callSecureApi } from '@/lib/apiClient';

// Deducts the withdrawal (+ any instant-transfer fee) from the signed-in
// user's balance and sends it out via a real Stripe Connect transfer +
// payout to their linked bank account (see api/_handlers/wallet.js). Falls
// back to a pending_manual queue only if they haven't connected a Stripe
// account yet, or the real attempt fails for some reason.
export async function processWithdrawal({ amount, method, payment_method_id } = {}) {
  try {
    const data = await callSecureApi('/api/wallet', { action: 'withdraw', amount, method, payment_method_id });
    return { data };
  } catch (error) {
    console.error('processWithdrawal error:', error);
    return { data: { success: false, error: error.message } };
  }
}

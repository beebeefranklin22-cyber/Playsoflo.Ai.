import { callSecureApi } from '@/lib/apiClient';

// Deducts the withdrawal (+ any instant-transfer fee) from the signed-in
// user's balance and queues a payout request. Actually wiring the payout to
// a real bank account needs Stripe Connect, which isn't configured yet — see
// api/wallet.js — so this records the request as pending_manual for now.
export async function processWithdrawal({ amount, method, payment_method_id } = {}) {
  try {
    const data = await callSecureApi('/api/wallet', { action: 'withdraw', amount, method, payment_method_id });
    return { data };
  } catch (error) {
    console.error('processWithdrawal error:', error);
    return { data: { success: false, error: error.message } };
  }
}

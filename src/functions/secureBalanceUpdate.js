import { callSecureApi } from '@/lib/apiClient';

// Peer-to-peer wallet transfer (send money, tips, etc). Debits the signed-in
// user and credits recipient_email; the server verifies the caller's
// identity from their session and checks their balance atomically.
export async function secureBalanceUpdate({ amount, credit_amount, recipient_email, reference_type, reference_id, memo } = {}) {
  try {
    const data = await callSecureApi('/api/wallet', {
      action: 'transfer',
      amount,
      credit_amount,
      recipient_email,
      reference_type,
      reference_id,
      memo,
    });
    return { data };
  } catch (error) {
    console.error('secureBalanceUpdate error:', error);
    return { data: { success: false, error: error.message } };
  }
}

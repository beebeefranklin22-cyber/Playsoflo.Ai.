import { callSecureApi } from '@/lib/apiClient';

// Debits the signed-in user's wallet balance for a flat, platform-sold
// purchase with no specific recipient (a game shop item, a premium
// subscription period) -- the server re-checks the balance atomically via
// wallet_move so this can't overdraw an account, and rejects with
// "Insufficient balance" rather than silently succeeding.
export async function purchaseWithWallet({ amount, reference_type, reference_id, memo } = {}) {
  try {
    const data = await callSecureApi('/api/wallet', { action: 'purchase', amount, reference_type, reference_id, memo });
    return { data };
  } catch (error) {
    console.error('purchaseWithWallet error:', error);
    return { data: { success: false, error: error.message } };
  }
}

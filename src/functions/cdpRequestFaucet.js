import { getAuthHeaders } from '@/lib/apiClient';

// Requests free Base Sepolia testnet ETH or USDC for the caller's CDP
// wallet -- there's no real exchange to buy testnet funds, so without this
// a newly created wallet has $0 and can never send anything.
export async function cdpRequestFaucet(data) {
  try {
    const response = await fetch('/api/crypto-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ action: 'faucet', ...data }),
    });
    if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'cdpRequestFaucet failed'); }
    return { data: await response.json() };
  } catch (error) {
    console.error('cdpRequestFaucet error:', error);
    throw error;
  }
}

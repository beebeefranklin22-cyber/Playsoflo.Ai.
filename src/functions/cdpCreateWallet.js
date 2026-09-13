import { getAuthHeaders } from '@/lib/apiClient';

export async function cdpCreateWallet(data) {
  try {
    const response = await fetch('/api/crypto-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ action: 'create', ...data }),
    });
    if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'cdpCreateWallet failed'); }
    return { data: await response.json() };
  } catch (error) {
    console.error('cdpCreateWallet error:', error);
    throw error;
  }
}

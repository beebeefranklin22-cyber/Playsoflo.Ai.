import { getAuthHeaders } from '@/lib/apiClient';

export async function cdpSendCrypto(data) {
  try {
    const response = await fetch('/api/crypto-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ action: 'send', ...data }),
    });
    if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'cdpSendCrypto failed'); }
    return { data: await response.json() };
  } catch (error) {
    console.error('cdpSendCrypto error:', error);
    throw error;
  }
}

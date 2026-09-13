import { getAuthHeaders } from '@/lib/apiClient';

export async function cdpGetBalance(data) {
  try {
    const response = await fetch('/api/crypto-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ action: 'balance', ...data }),
    });
    if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'cdpGetBalance failed'); }
    return { data: await response.json() };
  } catch (error) {
    console.error('cdpGetBalance error:', error);
    throw error;
  }
}

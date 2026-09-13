import { getEdgeFunctionUrl } from '@/lib/apiClient';
export async function cdpCreateWallet(data) {
  try {
    const response = await fetch(
      getEdgeFunctionUrl('cdpCreateWallet'),
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }, body: JSON.stringify(data) }
    );
    if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'cdpCreateWallet failed'); }
    return await response.json();
  } catch (error) { console.error('cdpCreateWallet error:', error); throw error; }
}

import { getEdgeFunctionUrl } from '@/lib/apiClient';
export async function createAdCampaign(data) {
  try {
    const response = await fetch(
      getEdgeFunctionUrl('createAdCampaign'),
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }, body: JSON.stringify(data) }
    );
    if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'createAdCampaign failed'); }
    return await response.json();
  } catch (error) { console.error('createAdCampaign error:', error); throw error; }
}

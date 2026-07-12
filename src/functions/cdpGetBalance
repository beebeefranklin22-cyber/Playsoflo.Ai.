export async function cdpGetBalance(data) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cdpGetBalance`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }, body: JSON.stringify(data) }
    );
    if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'cdpGetBalance failed'); }
    return await response.json();
  } catch (error) { console.error('cdpGetBalance error:', error); throw error; }
}

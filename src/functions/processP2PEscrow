export async function processP2PEscrow(data) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/processP2PEscrow`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }, body: JSON.stringify(data) }
    );
    if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'processP2PEscrow failed'); }
    return await response.json();
  } catch (error) { console.error('processP2PEscrow error:', error); throw error; }
}

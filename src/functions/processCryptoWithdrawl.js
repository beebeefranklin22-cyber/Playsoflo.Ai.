export async function processCryptoWithdrawal(data) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/processCryptoWithdrawal`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }, body: JSON.stringify(data) }
    );
    if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'processCryptoWithdrawal failed'); }
    return await response.json();
  } catch (error) { console.error('processCryptoWithdrawal error:', error); throw error; }
}

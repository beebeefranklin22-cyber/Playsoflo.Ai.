export async function generateAgoraToken(data) {
  try {
    const response = await fetch('/api/agora-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'generateAgoraToken failed'); }
    return await response.json();
  } catch (error) { console.error('generateAgoraToken error:', error); throw error; }
}

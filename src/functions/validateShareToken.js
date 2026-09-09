export async function validateShareToken({ token } = {}) {
  try {
    const res = await fetch('/api/shared', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    return { data };
  } catch (error) {
    return { data: { success: false, error: error.message } };
  }
}

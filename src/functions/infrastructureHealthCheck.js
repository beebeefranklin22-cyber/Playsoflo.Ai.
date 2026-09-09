export async function infrastructureHealthCheck() {
  try {
    const res = await fetch('/api/diagnostics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'infrastructure_check' }),
    });
    const data = await res.json();
    return { data: { status: data.status } };
  } catch (error) {
    return { data: { status: null, error: error.message } };
  }
}

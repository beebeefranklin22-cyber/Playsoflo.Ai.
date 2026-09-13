async function callDiagnostics(action, extra) {
  const res = await fetch('/api/diagnostics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  });
  return res.json();
}

export async function systemDiagnostics({ action, context } = {}) {
  const data = await callDiagnostics(action, { context });
  return { data };
}

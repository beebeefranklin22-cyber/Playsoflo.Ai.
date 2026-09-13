export async function predictiveAnalytics({ metricsHistory, currentState } = {}) {
  const res = await fetch('/api/diagnostics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'ai_diagnose', errorLogs: metricsHistory, systemMetrics: currentState }),
  });
  const data = await res.json();
  return { data };
}

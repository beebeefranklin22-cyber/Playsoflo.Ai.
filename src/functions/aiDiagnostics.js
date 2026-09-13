import { getAuthHeaders } from '@/lib/apiClient';

export async function aiDiagnostics({ errorLogs, systemMetrics } = {}) {
  const res = await fetch('/api/diagnostics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ action: 'ai_diagnose', errorLogs, systemMetrics }),
  });
  return res.json();
}

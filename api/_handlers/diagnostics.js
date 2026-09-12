import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { askClaudeForJson } from '../_lib/anthropic.js';
import { requireUser } from '../_lib/auth.js';

// Backs systemDiagnostics, infrastructureHealthCheck, and aiDiagnostics —
// admin-facing tooling, not core user flows. health_check/proactive_scan
// do a real Supabase connectivity check rather than fabricating status;
// aiDiagnostics genuinely uses Claude to read the error logs/metrics the
// client already collected and suggest likely causes.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { action, errorLogs, systemMetrics } = req.body || {};

  try {
    if (action === 'health_check' || action === 'proactive_scan' || action === 'performance_analysis' || action === 'cost_optimization') {
      return res.status(200).json(await systemDiagnostics(action));
    }
    if (action === 'ai_diagnose') {
      return res.status(200).json(await aiDiagnose(errorLogs, systemMetrics));
    }
    if (action === 'infrastructure_check') {
      return res.status(200).json(await systemDiagnostics('health_check'));
    }
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('diagnostics error:', action, err);
    return res.status(200).json({ status: 'unknown', error: err.message });
  }
}

async function systemDiagnostics(action) {
  const admin = getSupabaseAdmin();
  const start = Date.now();
  const { error: dbError } = await admin.from('profiles').select('id').limit(1);
  const db_latency_ms = Date.now() - start;
  const healthy = !dbError && db_latency_ms < 3000;

  const status = {
    database: healthy ? 'healthy' : 'degraded',
    db_latency_ms,
    checked_at: new Date().toISOString(),
  };

  const issues = [];
  if (dbError) issues.push({ severity: 'critical', area: 'database', message: dbError.message });
  else if (db_latency_ms > 1000) issues.push({ severity: 'warning', area: 'database', message: `Elevated DB latency: ${db_latency_ms}ms` });

  return {
    status,
    severity_summary: {
      critical: issues.filter((i) => i.severity === 'critical').length,
      warning: issues.filter((i) => i.severity === 'warning').length,
    },
    findings: { issues },
    // performance_analysis / cost_optimization don't have real infra
    // metrics to draw on yet (no APM/billing integration wired up) —
    // reported honestly as unavailable rather than invented.
    ...(action === 'performance_analysis' && { performance: { note: 'No APM integration configured yet' } }),
    ...(action === 'cost_optimization' && { cost_report: { note: 'No billing integration configured yet' } }),
  };
}

async function aiDiagnose(errorLogs, systemMetrics) {
  const result = await askClaudeForJson({
    systemPrompt:
      'You are a debugging assistant for a web app. Given recent client-side error logs and performance metrics, identify the most likely root cause and suggest one concrete fix. Return {"likely_cause": "...", "suggested_fix": "...", "severity": "low"|"medium"|"high"}.',
    prompt: JSON.stringify({ errorLogs, systemMetrics }),
  }).catch(() => ({ likely_cause: 'Unable to analyze', suggested_fix: 'Check server logs manually', severity: 'low' }));
  return result;
}

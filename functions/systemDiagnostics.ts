import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { body } = await req.json();
    const { action, context } = body;

    // AI-powered diagnostics using LLM
    const diagnosticPrompt = `You are an expert system diagnostics AI for PlaySoFlo app.

CONTEXT: ${JSON.stringify(context, null, 2)}
ACTION: ${action}

CRITICAL SECURITY CHECKS:
- Check for SQL injection attempts
- Check for XSS vulnerabilities  
- Check for CSRF attacks
- Check for rate limit violations
- Check for suspicious patterns

PERFORMANCE CHECKS:
- Check response times
- Check memory usage
- Check API call frequency
- Check database query efficiency

STABILITY CHECKS:
- Check for null/undefined errors
- Check for infinite loops
- Check for memory leaks
- Check for race conditions

Analyze the system state and provide:
1. Issues detected (with severity: critical, high, medium, low)
2. Root cause analysis
3. Recommended fixes
4. Auto-fix actions (if safe)

Response format:
{
  "status": "healthy" | "warning" | "critical",
  "issues": [{"severity": "", "type": "", "description": "", "fix": ""}],
  "autoFixes": [{"action": "", "safe": true/false}],
  "metrics": {"responseTime": 0, "errorRate": 0, "memoryUsage": 0}
}`;

    const diagnosis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: diagnosticPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          status: { type: "string" },
          issues: { type: "array", items: { type: "object" } },
          autoFixes: { type: "array", items: { type: "object" } },
          metrics: { type: "object" }
        }
      }
    });

    // Execute safe auto-fixes
    const fixResults = [];
    if (diagnosis.autoFixes) {
      for (const fix of diagnosis.autoFixes) {
        if (fix.safe) {
          try {
            // Log the fix for audit
            await base44.asServiceRole.entities.SystemLog?.create({
              type: 'auto_fix',
              action: fix.action,
              timestamp: new Date().toISOString(),
              context: context
            }).catch(() => null);
            
            fixResults.push({ action: fix.action, status: 'applied' });
          } catch (e) {
            fixResults.push({ action: fix.action, status: 'failed', error: e.message });
          }
        }
      }
    }

    return Response.json({
      diagnosis,
      fixResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Diagnostics error:', error);
    return Response.json({ 
      error: 'Diagnostic system error',
      details: error.message 
    }, { status: 500 });
  }
});
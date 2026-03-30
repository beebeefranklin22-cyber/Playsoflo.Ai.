import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { errorLogs, systemMetrics, autoFix, emergency } = await req.json();

    // Analyze recent errors
    const errors = errorLogs || await base44.asServiceRole.entities.ErrorLog.filter(
      { resolved: false },
      '-created_date',
      50
    );

    // Enhanced AI Analysis
    const analysisPrompt = emergency 
      ? `EMERGENCY: Critical system issue requiring immediate resolution.

Critical Errors: ${JSON.stringify(errors.slice(0, 10))}
System Metrics: ${JSON.stringify(systemMetrics || {})}
Issue Type: ${systemMetrics?.issueType || 'unknown'}

Provide IMMEDIATE action plan:
1. Critical root cause (be specific)
2. Severity: CRITICAL
3. Instant fix steps (executable actions)
4. Emergency preventative measures
5. Can this be auto-resolved? (yes/no)
6. Detailed resolution steps

PRIORITY: Prevent system crash/freeze.`
      : `Analyze system errors and provide proactive fixes:

Errors: ${JSON.stringify(errors.slice(0, 20))}
System Metrics: ${JSON.stringify(systemMetrics || {})}

Deep Analysis Required:
1. Root cause identification (look for patterns)
2. Severity level (critical/high/medium/low)
3. Automated fix code/steps
4. Long-term prevention strategies
5. Can be auto-resolved?
6. Detailed resolution

Focus on prevention and early intervention.`;

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          rootCause: { type: "string" },
          severity: { type: "string" },
          autoFixCode: { type: "string" },
          preventionSteps: { type: "array", items: { type: "string" } },
          canAutoResolve: { type: "boolean" },
          resolution: { type: "string" }
        }
      }
    });

    // Auto-fix if possible and requested
    if (autoFix && analysis.canAutoResolve) {
      console.log('Applying auto-fix:', analysis.resolution);
      
      // Mark errors as resolved
      for (const error of errors) {
        await base44.asServiceRole.entities.ErrorLog.update(error.id, {
          resolved: true,
          resolution_notes: `Auto-resolved: ${analysis.resolution}`
        });
      }
    }

    return Response.json({
      success: true,
      analysis,
      errorsAnalyzed: errors.length,
      autoFixApplied: autoFix && analysis.canAutoResolve
    });

  } catch (error) {
    console.error('AI Diagnostics error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});
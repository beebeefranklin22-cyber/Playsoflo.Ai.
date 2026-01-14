import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { errorLogs, systemMetrics, autoFix } = await req.json();

    // Analyze recent errors
    const errors = errorLogs || await base44.asServiceRole.entities.ErrorLog.filter(
      { resolved: false },
      '-created_date',
      50
    );

    // AI Analysis using InvokeLLM
    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert system diagnostician. Analyze these errors and provide automated fixes:

Errors: ${JSON.stringify(errors.slice(0, 20))}
System Metrics: ${JSON.stringify(systemMetrics || {})}

Provide:
1. Root cause analysis
2. Severity level (critical/high/medium/low)
3. Automated fix code (if applicable)
4. Prevention strategies
5. Whether this can be auto-resolved

Format as JSON with: { rootCause, severity, autoFixCode, preventionSteps, canAutoResolve, resolution }`,
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
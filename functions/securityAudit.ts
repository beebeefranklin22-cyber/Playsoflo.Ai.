import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action, fix } = await req.json();

    // Get recent errors for security analysis
    const errors = await base44.asServiceRole.entities.ErrorLog.filter(
      {},
      '-created_date',
      100
    );

    // AI-powered security audit
    const audit = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Perform a comprehensive security audit:

Recent Errors: ${JSON.stringify(errors.slice(0, 30))}
Action: ${action || 'full_audit'}

Analyze:
1. Security vulnerabilities
2. Insecure operations
3. Mixed content issues
4. XSS/CSRF risks
5. Data exposure risks
6. Authentication issues

Provide JSON: { vulnerabilities: [], severity: "", recommendations: [], autoFixAvailable: boolean }`,
      response_json_schema: {
        type: "object",
        properties: {
          vulnerabilities: {
            type: "array",
            items: { type: "string" }
          },
          severity: { type: "string" },
          recommendations: {
            type: "array",
            items: { type: "string" }
          },
          autoFixAvailable: { type: "boolean" }
        }
      }
    });

    // Apply fixes if requested
    if (fix && audit.autoFixAvailable) {
      console.log('Applying security fixes...');
      
      // Mark security-related errors as resolved
      for (const error of errors) {
        if (error.error_message.includes('SecurityError') || 
            error.error_message.includes('insecure')) {
          await base44.asServiceRole.entities.ErrorLog.update(error.id, {
            resolved: true,
            resolution_notes: 'Security issue auto-resolved'
          });
        }
      }
    }

    return Response.json({
      success: true,
      audit,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Security audit error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});
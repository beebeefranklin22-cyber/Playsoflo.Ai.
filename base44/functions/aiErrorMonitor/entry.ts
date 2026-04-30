import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * AI-Enhanced Error Monitoring & Incident Management
 * - Receives error reports from frontend
 * - Uses AI to classify severity, detect patterns, and generate incident alerts
 * - Auto-creates support tickets for critical errors
 * - Tracks error frequency to detect outages
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { error_message, error_stack, error_type, url, user_agent, component_stack, locale, user_email } = body;

    // 1. Determine user context
    let resolvedEmail = user_email || 'anonymous';
    try {
      const user = await base44.auth.me();
      if (user?.email) resolvedEmail = user.email;
    } catch (_) {}

    const timestamp = new Date().toISOString();

    // 2. Store raw error log
    let errorLogId = null;
    try {
      const log = await base44.asServiceRole.entities.ErrorLog.create({
        error_message: (error_message || 'Unknown').substring(0, 500),
        error_stack: (error_stack || '').substring(0, 2000),
        error_type: error_type || 'unknown',
        user_email: resolvedEmail,
        url: url || '',
        user_agent: user_agent || '',
        component_stack: (component_stack || '').substring(0, 1000),
        timestamp,
      });
      errorLogId = log?.id;
    } catch (dbErr) {
      console.warn('DB write failed:', dbErr.message);
    }

    // 3. Check error frequency in the last 10 minutes (detect spikes/outages)
    let recentCount = 0;
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const recentErrors = await base44.asServiceRole.entities.ErrorLog.filter({
        error_type: error_type || 'unknown',
      });
      recentCount = recentErrors.filter(e => e.timestamp > tenMinutesAgo).length;
    } catch (_) {}

    // 4. AI analysis — classify severity, root cause, recommended action
    let aiAnalysis = null;
    try {
      aiAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an expert software reliability engineer. Analyze this frontend error and provide a structured incident report.

Error Type: ${error_type}
Error Message: ${error_message}
Stack Trace: ${(error_stack || '').substring(0, 800)}
Component Stack: ${component_stack || 'N/A'}
URL: ${url}
User Agent: ${user_agent}
Recent occurrences (last 10 min): ${recentCount}
Locale: ${locale || 'unknown'}

Respond with:
1. severity: "low" | "medium" | "high" | "critical"
2. category: e.g. "network", "auth", "payment", "rendering", "data", "permissions", "unknown"
3. root_cause: 1-sentence likely root cause
4. user_impact: 1-sentence description of what the user likely experienced
5. recommended_action: what the engineering team should do
6. is_likely_outage: true if recentCount > 10, else false
7. auto_resolve_hint: any self-healing suggestion (e.g. "retry", "clear cache", "re-login")`,
        response_json_schema: {
          type: 'object',
          properties: {
            severity: { type: 'string' },
            category: { type: 'string' },
            root_cause: { type: 'string' },
            user_impact: { type: 'string' },
            recommended_action: { type: 'string' },
            is_likely_outage: { type: 'boolean' },
            auto_resolve_hint: { type: 'string' },
          },
        },
      });
    } catch (aiErr) {
      console.warn('AI analysis failed:', aiErr.message);
      aiAnalysis = {
        severity: recentCount > 10 ? 'critical' : 'medium',
        category: 'unknown',
        root_cause: 'Could not determine automatically',
        user_impact: 'User encountered an error',
        recommended_action: 'Investigate error logs manually',
        is_likely_outage: recentCount > 10,
        auto_resolve_hint: 'retry',
      };
    }

    console.log(`[aiErrorMonitor] ${aiAnalysis.severity?.toUpperCase()} | ${aiAnalysis.category} | ${error_message?.substring(0, 100)}`);

    // 5. Auto-create support ticket for high/critical errors
    if (aiAnalysis.severity === 'high' || aiAnalysis.severity === 'critical') {
      try {
        await base44.asServiceRole.entities.SupportTicket.create({
          subject: `[${aiAnalysis.severity?.toUpperCase()}] Auto-Incident: ${aiAnalysis.category} error`,
          description: `**AI Incident Report**\n\n**Root Cause:** ${aiAnalysis.root_cause}\n\n**User Impact:** ${aiAnalysis.user_impact}\n\n**Recommended Action:** ${aiAnalysis.recommended_action}\n\n**Error:** ${error_message}\n\n**URL:** ${url}\n\n**User:** ${resolvedEmail}\n\n**Recent Count (10min):** ${recentCount}\n\n**Outage Likely:** ${aiAnalysis.is_likely_outage}\n\n**Error Log ID:** ${errorLogId}`,
          priority: aiAnalysis.severity === 'critical' ? 'urgent' : 'high',
          status: 'open',
          error_log_id: errorLogId,
          category: aiAnalysis.category,
        });
      } catch (ticketErr) {
        console.warn('Failed to create incident ticket:', ticketErr.message);
      }
    }

    // 6. Send email alert for critical outage
    if (aiAnalysis.is_likely_outage || aiAnalysis.severity === 'critical') {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'admin@yourdomain.com', // replace with real admin email
          subject: `🚨 CRITICAL INCIDENT ALERT: ${aiAnalysis.category} outage detected`,
          body: `A critical error pattern has been detected.\n\nSeverity: ${aiAnalysis.severity}\nCategory: ${aiAnalysis.category}\nOccurrences (10min): ${recentCount}\n\nRoot Cause: ${aiAnalysis.root_cause}\nUser Impact: ${aiAnalysis.user_impact}\nRecommended Action: ${aiAnalysis.recommended_action}\n\nError: ${error_message}\nURL: ${url}\nTimestamp: ${timestamp}`,
        });
      } catch (_) {}
    }

    return Response.json({
      success: true,
      error_log_id: errorLogId,
      analysis: aiAnalysis,
      recent_count: recentCount,
      auto_resolve_hint: aiAnalysis.auto_resolve_hint,
    });

  } catch (err) {
    console.error('[aiErrorMonitor] Fatal:', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});
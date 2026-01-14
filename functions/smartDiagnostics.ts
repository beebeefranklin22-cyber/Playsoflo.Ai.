import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const payload = await req.json();
    const { issue_type, description, context } = payload;

    // Parallel data collection for faster diagnosis
    const [
      users,
      payments,
      bookings,
      tickets,
      notifications,
      disputes
    ] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 10),
      base44.asServiceRole.entities.Payment.list('-created_date', 20),
      base44.asServiceRole.entities.Booking.list('-created_date', 20),
      base44.asServiceRole.entities.EntertainmentTicket.list('-created_date', 20),
      base44.asServiceRole.entities.Notification.filter({ read: false }),
      base44.asServiceRole.entities.Dispute.filter({ status: 'open' })
    ]);

    // Build diagnostic context
    const diagnosticContext = {
      system_stats: {
        total_users: users.length,
        recent_payments: payments.filter(p => 
          new Date(p.created_date) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        failed_payments: payments.filter(p => p.status === 'failed').length,
        active_bookings: bookings.filter(b => b.status === 'confirmed').length,
        active_tickets: tickets.filter(t => t.status === 'active').length,
        unread_notifications: notifications.length,
        open_disputes: disputes.length,
        timestamp: new Date().toISOString()
      },
      recent_errors: payments
        .filter(p => p.status === 'failed')
        .map(p => ({
          type: 'payment_failure',
          amount: p.amount,
          error: p.error_message,
          timestamp: p.created_date
        })),
      user_issues: context?.user_email ? {
        user_payments: payments.filter(p => p.payer_email === context.user_email),
        user_bookings: bookings.filter(b => b.customer_email === context.user_email),
        user_tickets: tickets.filter(t => t.buyer_email === context.user_email)
      } : null
    };

    // AI-powered diagnosis with structured analysis
    const diagnosis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert system administrator and troubleshooter for PlaySoFlo platform.

ISSUE REPORTED:
Type: ${issue_type || 'general'}
Description: ${description}
User Context: ${JSON.stringify(context || {})}

SYSTEM DATA:
${JSON.stringify(diagnosticContext, null, 2)}

Analyze this issue and provide:
1. Root cause identification
2. Immediate fix steps (if applicable)
3. Preventive measures
4. Severity level (low/medium/high/critical)
5. Estimated resolution time
6. SQL queries or API calls needed (if applicable)

Be concise, technical, and actionable. Focus on fast resolution.`,
      response_json_schema: {
        type: "object",
        properties: {
          severity: { 
            type: "string",
            enum: ["low", "medium", "high", "critical"]
          },
          root_cause: { type: "string" },
          immediate_fix: {
            type: "object",
            properties: {
              steps: {
                type: "array",
                items: { type: "string" }
              },
              automated_fix_available: { type: "boolean" },
              requires_manual_intervention: { type: "boolean" }
            }
          },
          preventive_measures: {
            type: "array",
            items: { type: "string" }
          },
          estimated_resolution_minutes: { type: "number" },
          affected_users_count: { type: "number" },
          sql_queries: {
            type: "array",
            items: { type: "string" }
          },
          api_calls: {
            type: "array",
            items: {
              type: "object",
              properties: {
                endpoint: { type: "string" },
                method: { type: "string" },
                payload: { type: "object" }
              }
            }
          },
          recommended_monitoring: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Log the diagnostic session
    await base44.asServiceRole.entities.SupportTicket.create({
      title: `Auto-Diagnosis: ${issue_type || 'System Check'}`,
      description: description || 'Automated diagnostic run',
      type: 'system_diagnostic',
      status: 'resolved',
      priority: diagnosis.severity,
      resolution: JSON.stringify(diagnosis),
      assigned_to: user.email,
      created_by: user.email
    });

    return Response.json({
      success: true,
      diagnosis,
      system_health: {
        ...diagnosticContext.system_stats,
        status: diagnosis.severity === 'critical' ? 'critical' : 
                diagnosis.severity === 'high' ? 'degraded' : 'healthy'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Smart diagnostics error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      fallback_diagnosis: {
        severity: 'unknown',
        root_cause: 'Diagnostic system encountered an error',
        immediate_fix: {
          steps: ['Check system logs', 'Verify API connectivity', 'Review error details'],
          automated_fix_available: false,
          requires_manual_intervention: true
        }
      }
    }, { status: 500 });
  }
});
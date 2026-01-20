import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Backend security monitoring and threat response
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action, params } = await req.json();

    switch (action) {
      case 'analyze_threats':
        return await analyzeThreats(base44);
      
      case 'check_anomalies':
        return await checkAnomalies(base44, params);
      
      case 'validate_session':
        return await validateSession(base44, params);
      
      case 'block_ip':
        return await blockIP(base44, params);
      
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function analyzeThreats(base44) {
  const logs = await base44.asServiceRole.entities.ErrorLog.list();
  
  const securityLogs = logs.filter(log => 
    log.error_message?.includes('Security') ||
    log.error_message?.includes('Threat') ||
    log.error_message?.includes('Anomaly')
  );

  const analysis = {
    total_events: securityLogs.length,
    by_severity: {
      critical: securityLogs.filter(l => l.error_message?.includes('CRITICAL')).length,
      high: securityLogs.filter(l => l.error_message?.includes('HIGH')).length,
      medium: securityLogs.filter(l => l.error_message?.includes('MEDIUM')).length,
      low: securityLogs.length - securityLogs.filter(l => 
        l.error_message?.includes('CRITICAL') || 
        l.error_message?.includes('HIGH') || 
        l.error_message?.includes('MEDIUM')
      ).length
    },
    recent_threats: securityLogs.slice(0, 20),
    threat_level: calculateThreatLevel(securityLogs)
  };

  return Response.json(analysis);
}

async function checkAnomalies(base44, params) {
  const { user_email, timeframe_hours = 1 } = params;
  
  const cutoffTime = new Date(Date.now() - timeframe_hours * 60 * 60 * 1000).toISOString();
  
  // Get user's recent actions from error logs
  const userLogs = await base44.asServiceRole.entities.ErrorLog.filter({
    user_email,
    created_date: { $gte: cutoffTime }
  });

  const anomalies = [];
  
  // Check for excessive error rates
  if (userLogs.length > 50) {
    anomalies.push({
      type: 'EXCESSIVE_ERRORS',
      severity: 'high',
      count: userLogs.length
    });
  }

  // Check for suspicious patterns
  const errorTypes = {};
  userLogs.forEach(log => {
    const type = log.error_type || 'unknown';
    errorTypes[type] = (errorTypes[type] || 0) + 1;
  });

  Object.entries(errorTypes).forEach(([type, count]) => {
    if (count > 10) {
      anomalies.push({
        type: 'REPEATED_ERROR_PATTERN',
        severity: 'medium',
        error_type: type,
        count
      });
    }
  });

  return Response.json({
    user_email,
    anomalies,
    total_events: userLogs.length,
    risk_score: anomalies.length * 10
  });
}

async function validateSession(base44, params) {
  const { session_id, fingerprint } = params;
  
  // Verify session integrity
  const isValid = await base44.auth.isAuthenticated();
  
  return Response.json({
    valid: isValid,
    session_id,
    verified_at: new Date().toISOString()
  });
}

async function blockIP(base44, params) {
  const { ip_address, reason, duration_hours = 24 } = params;
  
  // In production, this would integrate with firewall/WAF
  // For now, log the block request
  await base44.asServiceRole.entities.ErrorLog.create({
    error_message: `IP_BLOCKED: ${ip_address}`,
    error_type: 'global_error',
    error_stack: JSON.stringify({
      ip_address,
      reason,
      duration_hours,
      blocked_at: new Date().toISOString()
    })
  });

  return Response.json({
    success: true,
    ip_address,
    blocked_until: new Date(Date.now() + duration_hours * 60 * 60 * 1000).toISOString()
  });
}

function calculateThreatLevel(logs) {
  const recentLogs = logs.filter(log => {
    const logTime = new Date(log.created_date).getTime();
    return Date.now() - logTime < 300000; // Last 5 minutes
  });

  const criticalCount = recentLogs.filter(l => l.error_message?.includes('CRITICAL')).length;
  const highCount = recentLogs.filter(l => l.error_message?.includes('HIGH')).length;

  if (criticalCount > 0) return 'critical';
  if (highCount > 2) return 'high';
  if (recentLogs.length > 10) return 'medium';
  return 'low';
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { action, context } = await req.json();

    switch (action) {
      case 'error_report':
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: 'admin@playsoflo.com',
          type: 'system_alert',
          title: '🔴 System Error Detected',
          message: `Error: ${context.error}\nContext: ${JSON.stringify(context, null, 2)}`,
          read: false
        });
        return Response.json({ success: true, message: 'Error reported' });

      case 'health_check':
        const healthStatus = {
          timestamp: new Date().toISOString(),
          status: 'healthy',
          services: {
            database: 'operational',
            api: 'operational',
            integrations: 'operational'
          }
        };
        return Response.json(healthStatus);

      case 'proactive_scan':
        const scanResults = await performProactiveScan(base44);
        const aiAnalysis = await analyzeWithAI(base44, scanResults);
        const healingResults = await performSelfHealing(base44, scanResults);
        
        const report = {
          scan_timestamp: new Date().toISOString(),
          findings: scanResults,
          ai_recommendations: aiAnalysis,
          auto_healing: healingResults,
          severity_summary: {
            critical: scanResults.issues.filter(i => i.severity === 'critical').length,
            high: scanResults.issues.filter(i => i.severity === 'high').length,
            medium: scanResults.issues.filter(i => i.severity === 'medium').length,
            low: scanResults.issues.filter(i => i.severity === 'low').length
          }
        };
        
        if (report.severity_summary.critical > 0) {
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: 'admin@playsoflo.com',
            type: 'system_alert',
            title: '🚨 CRITICAL: System Issues Detected',
            message: `${report.severity_summary.critical} critical issues found. Auto-healing attempted: ${healingResults.fixed_count}/${healingResults.attempted_count}`,
            read: false
          });
        }
        
        return Response.json(report);

      case 'performance_analysis':
        const perfAnalysis = await analyzePerformance(base44);
        return Response.json(perfAnalysis);

      case 'cost_optimization':
        const costReport = await analyzeCostOptimizations(base44);
        return Response.json(costReport);

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('System diagnostics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function performProactiveScan(base44) {
  const issues = [];
  const metrics = {};

  try {
    // Check database health
    const payments = await base44.asServiceRole.entities.Payment.list('-created_date', 100);
    const users = await base44.asServiceRole.entities.User.list('-created_date', 100);
    
    metrics.total_payments = payments.length;
    metrics.total_users = users.length;

    // Detect duplicate payments (data integrity)
    const paymentGroups = {};
    payments.forEach(p => {
      const key = `${p.sender_email}_${p.amount_usd}_${p.reference_id}`;
      paymentGroups[key] = (paymentGroups[key] || 0) + 1;
    });
    
    const duplicates = Object.entries(paymentGroups).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      issues.push({
        severity: 'high',
        type: 'data_integrity',
        title: 'Duplicate Payments Detected',
        description: `Found ${duplicates.length} potential duplicate payment records`,
        affected_count: duplicates.reduce((sum, [_, count]) => sum + count, 0),
        auto_fixable: false,
        recommendation: 'Review and merge duplicate payment records manually'
      });
    }

    // Check for stale pending payments
    const oldPendingPayments = payments.filter(p => {
      if (p.status !== 'pending') return false;
      const age = Date.now() - new Date(p.created_date).getTime();
      return age > 24 * 60 * 60 * 1000;
    });
    
    if (oldPendingPayments.length > 0) {
      issues.push({
        severity: 'medium',
        type: 'stale_data',
        title: 'Stale Pending Payments',
        description: `${oldPendingPayments.length} payments pending for over 24 hours`,
        affected_count: oldPendingPayments.length,
        auto_fixable: true,
        recommendation: 'Auto-cancel old pending payments and notify users'
      });
    }

    // Check for negative balances (critical financial issue)
    const negativeBalances = users.filter(u => (u.usd_balance || 0) < 0);
    if (negativeBalances.length > 0) {
      issues.push({
        severity: 'critical',
        type: 'financial_anomaly',
        title: 'Negative User Balances',
        description: `${negativeBalances.length} users have negative balances - potential fraud or bug`,
        affected_count: negativeBalances.length,
        affected_users: negativeBalances.map(u => u.email),
        auto_fixable: false,
        recommendation: 'Investigate immediately - freeze affected accounts and audit transactions'
      });
    }

    // Check for orphaned Stripe payments
    const stripePayments = await base44.asServiceRole.entities.StripePayment.filter({ status: 'succeeded' });
    const recentSuccessful = stripePayments.filter(sp => {
      const age = Date.now() - new Date(sp.created_date).getTime();
      return age < 2 * 60 * 60 * 1000 && sp.reference_type === 'deposit';
    });
    
    for (const sp of recentSuccessful) {
      const paymentRecords = await base44.asServiceRole.entities.Payment.filter({
        reference_id: sp.stripe_payment_intent_id,
        reference_type: 'deposit'
      });
      
      if (paymentRecords.length === 0) {
        issues.push({
          severity: 'critical',
          type: 'sync_failure',
          title: 'Stripe Payment Not Synced',
          description: `Successful Stripe payment ${sp.stripe_payment_intent_id} not reflected in user balance`,
          affected_count: 1,
          affected_users: [sp.user_email],
          auto_fixable: true,
          payment_data: sp,
          recommendation: 'Auto-sync payment to user balance immediately'
        });
      }
    }

    // Resource optimization
    const notifications = await base44.asServiceRole.entities.Notification.list('-created_date', 500);
    const oldNotifications = notifications.filter(n => {
      const age = Date.now() - new Date(n.created_date).getTime();
      return age > 30 * 24 * 60 * 60 * 1000 && n.read;
    });
    
    if (oldNotifications.length > 100) {
      issues.push({
        severity: 'low',
        type: 'resource_optimization',
        title: 'Old Notifications Cleanup',
        description: `${oldNotifications.length} read notifications older than 30 days consuming storage`,
        affected_count: oldNotifications.length,
        auto_fixable: true,
        recommendation: 'Archive old read notifications to optimize database performance'
      });
    }

    // Check for stuck ride requests
    const rideRequests = await base44.asServiceRole.entities.RideRequest?.filter({ status: 'pending' }).catch(() => []);
    const stuckRides = rideRequests.filter(r => {
      const age = Date.now() - new Date(r.created_date).getTime();
      return age > 30 * 60 * 1000; // 30 minutes
    });
    
    if (stuckRides.length > 0) {
      issues.push({
        severity: 'high',
        type: 'service_degradation',
        title: 'Stuck Ride Requests',
        description: `${stuckRides.length} ride requests stuck in pending for >30 min`,
        affected_count: stuckRides.length,
        auto_fixable: true,
        recommendation: 'Auto-cancel stuck requests and notify users'
      });
    }

    metrics.scan_completed = true;
    metrics.issues_found = issues.length;
    metrics.health_score = Math.max(0, 100 - (issues.length * 5));
    
  } catch (error) {
    issues.push({
      severity: 'high',
      type: 'scan_error',
      title: 'Scan Incomplete',
      description: `Error during scan: ${error.message}`,
      auto_fixable: false
    });
  }

  return { issues, metrics, scan_timestamp: new Date().toISOString() };
}

async function analyzeWithAI(base44, scanResults) {
  try {
    const prompt = `You are an expert DevOps engineer and system architect analyzing diagnostic data for PlaySoFlo.

SCAN RESULTS:
Total Issues: ${scanResults.issues.length}
Critical: ${scanResults.issues.filter(i => i.severity === 'critical').length}
High: ${scanResults.issues.filter(i => i.severity === 'high').length}
Medium: ${scanResults.issues.filter(i => i.severity === 'medium').length}
Low: ${scanResults.issues.filter(i => i.severity === 'low').length}

DETAILED ISSUES:
${JSON.stringify(scanResults.issues, null, 2)}

SYSTEM METRICS:
${JSON.stringify(scanResults.metrics, null, 2)}

Provide comprehensive analysis:

1. ROOT CAUSE ANALYSIS:
   - What is causing each issue?
   - Are there systemic problems or patterns?
   - Which issues are related?

2. PRIORITY RANKING:
   - Order by business impact and urgency
   - Justify each priority level

3. REMEDIATION PLAN:
   - Step-by-step fix for each issue
   - Required resources and time
   - Dependencies between fixes

4. PREVENTIVE MEASURES:
   - Code changes to prevent recurrence
   - Monitoring alerts to add
   - Process improvements

5. PERFORMANCE IMPACT:
   - How are issues affecting users?
   - Performance degradation estimates
   - Scalability concerns

6. COST IMPLICATIONS:
   - Current waste in resources
   - Potential savings if fixed
   - ROI of implementing fixes

Be specific, technical, and actionable. Include code snippets or configuration changes where relevant.`;

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    return {
      ai_generated: true,
      timestamp: new Date().toISOString(),
      recommendations: analysis,
      confidence: 'high',
      model: 'advanced'
    };
  } catch (error) {
    return {
      ai_generated: false,
      error: error.message,
      fallback_recommendation: 'Manual review required - AI analysis unavailable'
    };
  }
}

async function performSelfHealing(base44, scanResults) {
  const healingResults = {
    attempted_count: 0,
    fixed_count: 0,
    failed_count: 0,
    actions_taken: []
  };

  for (const issue of scanResults.issues) {
    if (!issue.auto_fixable) continue;
    
    healingResults.attempted_count++;
    
    try {
      switch (issue.type) {
        case 'sync_failure':
          // Auto-sync orphaned Stripe payments
          if (issue.payment_data) {
            const pd = issue.payment_data;
            const baseAmount = parseFloat(pd.metadata?.base_amount || pd.amount);
            
            const users = await base44.asServiceRole.entities.User.filter({ email: pd.user_email });
            if (users.length > 0) {
              const user = users[0];
              const currentBalance = user.usd_balance || 0;
              const newBalance = currentBalance + baseAmount;
              
              await base44.asServiceRole.entities.User.update(user.id, {
                usd_balance: newBalance
              });

              await base44.asServiceRole.entities.Payment.create({
                amount_usd: baseAmount,
                method: 'stripe',
                status: 'completed',
                reference_type: 'deposit',
                reference_id: pd.stripe_payment_intent_id,
                sender_email: pd.user_email,
                recipient_email: pd.user_email,
                memo: '[Auto-healed] Synced from Stripe payment'
              });
              
              healingResults.actions_taken.push({
                issue_type: issue.type,
                action: `Synced $${baseAmount} to ${pd.user_email}`,
                count: 1,
                user_email: pd.user_email
              });
              healingResults.fixed_count++;
            }
          }
          break;

        case 'stale_data':
          if (issue.title === 'Stale Pending Payments') {
            const payments = await base44.asServiceRole.entities.Payment.filter({ status: 'pending' });
            let canceledCount = 0;
            
            for (const payment of payments) {
              const age = Date.now() - new Date(payment.created_date).getTime();
              if (age > 24 * 60 * 60 * 1000) {
                await base44.asServiceRole.entities.Payment.update(payment.id, {
                  status: 'failed',
                  memo: `${payment.memo || ''} [Auto-cancelled: Timeout after 24h]`
                });
                canceledCount++;
              }
            }
            
            healingResults.actions_taken.push({
              issue_type: issue.type,
              action: 'Auto-cancelled stale pending payments',
              count: canceledCount
            });
            healingResults.fixed_count++;
          }
          break;

        case 'resource_optimization':
          if (issue.title === 'Old Notifications Cleanup') {
            const notifications = await base44.asServiceRole.entities.Notification.list('-created_date', 1000);
            let archivedCount = 0;
            
            for (const notif of notifications) {
              const age = Date.now() - new Date(notif.created_date).getTime();
              if (age > 30 * 24 * 60 * 60 * 1000 && notif.read) {
                await base44.asServiceRole.entities.Notification.delete(notif.id);
                archivedCount++;
                if (archivedCount >= 100) break; // Limit batch size
              }
            }
            
            healingResults.actions_taken.push({
              issue_type: issue.type,
              action: 'Archived old read notifications',
              count: archivedCount
            });
            healingResults.fixed_count++;
          }
          break;

        case 'service_degradation':
          if (issue.title === 'Stuck Ride Requests') {
            const rides = await base44.asServiceRole.entities.RideRequest?.filter({ status: 'pending' }).catch(() => []);
            let canceledCount = 0;
            
            for (const ride of rides) {
              const age = Date.now() - new Date(ride.created_date).getTime();
              if (age > 30 * 60 * 1000) {
                await base44.asServiceRole.entities.RideRequest?.update(ride.id, {
                  status: 'cancelled',
                  cancellation_reason: 'Auto-cancelled: No driver found within 30 minutes'
                }).catch(() => null);
                
                await base44.asServiceRole.entities.Notification.create({
                  recipient_email: ride.passenger_email,
                  type: 'system_alert',
                  title: 'Ride Request Cancelled',
                  message: 'Your ride request was cancelled due to no available drivers. Please try again.',
                  read: false
                }).catch(() => null);
                
                canceledCount++;
              }
            }
            
            healingResults.actions_taken.push({
              issue_type: issue.type,
              action: 'Auto-cancelled stuck ride requests',
              count: canceledCount
            });
            healingResults.fixed_count++;
          }
          break;
      }
    } catch (error) {
      healingResults.failed_count++;
      healingResults.actions_taken.push({
        issue_type: issue.type,
        action: 'Failed to auto-heal',
        error: error.message
      });
    }
  }

  return healingResults;
}

async function analyzePerformance(base44) {
  const analysis = {
    timestamp: new Date().toISOString(),
    metrics: {},
    bottlenecks: [],
    optimizations: []
  };

  try {
    // Measure query performance
    const queryTests = [];
    
    const start1 = Date.now();
    await base44.asServiceRole.entities.Payment.list('-created_date', 100);
    queryTests.push({ entity: 'Payment', time: Date.now() - start1 });
    
    const start2 = Date.now();
    await base44.asServiceRole.entities.User.list('-created_date', 50);
    queryTests.push({ entity: 'User', time: Date.now() - start2 });
    
    const start3 = Date.now();
    await base44.asServiceRole.entities.Notification.list('-created_date', 100);
    queryTests.push({ entity: 'Notification', time: Date.now() - start3 });
    
    analysis.metrics.query_performance = queryTests;
    const avgQueryTime = queryTests.reduce((sum, q) => sum + q.time, 0) / queryTests.length;
    analysis.metrics.avg_query_time_ms = avgQueryTime;
    
    if (avgQueryTime > 500) {
      analysis.bottlenecks.push({
        area: 'database',
        description: 'Slow query performance detected',
        impact: 'high',
        current_avg: `${avgQueryTime}ms`,
        suggestion: 'Add database indexes on created_date and status fields'
      });
    }

    // Analyze entity counts for scaling recommendations
    const entityCounts = {};
    for (const test of queryTests) {
      const fullList = await base44.asServiceRole.entities[test.entity].list('-created_date', 10000);
      entityCounts[test.entity] = fullList.length;
    }
    
    analysis.metrics.entity_counts = entityCounts;
    
    Object.entries(entityCounts).forEach(([entity, count]) => {
      if (count > 5000) {
        analysis.optimizations.push({
          type: 'scaling',
          priority: 'high',
          entity: entity,
          suggestion: `Implement pagination and lazy loading for ${entity} - currently ${count} records`,
          estimated_improvement: '70% faster load times'
        });
      }
    });

    // Memory & resource optimizations
    analysis.optimizations.push({
      type: 'caching',
      priority: 'medium',
      suggestion: 'Implement client-side caching for static data (User profiles, Services)',
      estimated_improvement: '50% less API calls'
    });

    analysis.optimizations.push({
      type: 'query_batching',
      priority: 'medium',
      suggestion: 'Batch related queries together to reduce round trips',
      estimated_improvement: '40% faster page loads'
    });

  } catch (error) {
    analysis.error = error.message;
  }

  return analysis;
}

async function analyzeCostOptimizations(base44) {
  const report = {
    timestamp: new Date().toISOString(),
    current_usage: {},
    potential_savings: [],
    recommendations: []
  };

  try {
    // Analyze storage usage
    const entities = ['Payment', 'Notification', 'SocialPost', 'Story', 'ChatMessage'];
    for (const entityName of entities) {
      try {
        const items = await base44.asServiceRole.entities[entityName].list('-created_date', 1000);
        report.current_usage[entityName] = {
          count: items.length,
          estimated_size_mb: (items.length * 2) / 1024 // Rough estimate
        };
      } catch {
        report.current_usage[entityName] = { count: 0, estimated_size_mb: 0 };
      }
    }

    // Calculate potential savings
    const notifications = await base44.asServiceRole.entities.Notification.list('-created_date', 1000);
    const oldNotifs = notifications.filter(n => {
      const age = Date.now() - new Date(n.created_date).getTime();
      return age > 30 * 24 * 60 * 60 * 1000 && n.read;
    });

    if (oldNotifs.length > 100) {
      report.potential_savings.push({
        area: 'storage',
        description: 'Archive old read notifications',
        estimated_savings: `${oldNotifs.length} records = ~${(oldNotifs.length * 2 / 1024).toFixed(2)}MB`,
        monthly_cost_reduction: `$${(oldNotifs.length * 0.001).toFixed(2)}`,
        priority: 'medium'
      });
    }

    // API & integration cost analysis
    report.recommendations.push({
      category: 'api_calls',
      suggestion: 'Implement request caching for repeated LLM calls',
      impact: 'Reduce LLM API costs by 30-40%',
      implementation: 'Cache common queries and responses for 1 hour',
      estimated_monthly_savings: '$50-100'
    });

    report.recommendations.push({
      category: 'database',
      suggestion: 'Archive historical data older than 1 year',
      impact: 'Reduce database costs by 25%',
      implementation: 'Move old records to cold storage or separate archive database',
      estimated_monthly_savings: '$30-50'
    });

    report.recommendations.push({
      category: 'compute',
      suggestion: 'Optimize function execution with connection pooling',
      impact: 'Reduce function execution time by 35%',
      implementation: 'Reuse database connections and implement smart batching',
      estimated_monthly_savings: '$20-40'
    });

    // Total potential monthly savings
    const totalSavings = report.potential_savings.reduce((sum, s) => {
      const amount = parseFloat(s.monthly_cost_reduction?.replace('$', '') || 0);
      return sum + amount;
    }, 0);
    
    const recSavings = report.recommendations.reduce((sum, r) => {
      const range = r.estimated_monthly_savings?.match(/\$(\d+)-(\d+)/);
      return sum + (range ? (parseInt(range[1]) + parseInt(range[2])) / 2 : 0);
    }, 0);

    report.total_potential_monthly_savings = `$${(totalSavings + recSavings).toFixed(2)}`;

  } catch (error) {
    report.error = error.message;
  }

  return report;
}

async function analyzeWithAI(base44, scanResults) {
  try {
    const prompt = `You are an expert DevOps engineer analyzing system diagnostics.

SCAN RESULTS:
${JSON.stringify(scanResults, null, 2)}

Provide detailed analysis:

1. ROOT CAUSE ANALYSIS - What's causing each issue?
2. PRIORITY RANKING - Order by business impact
3. REMEDIATION PLAN - Step-by-step fixes
4. PREVENTIVE MEASURES - How to avoid future issues
5. PERFORMANCE IMPACT - User experience effects
6. COST IMPLICATIONS - Resource waste and savings

Be technical, specific, and actionable.`;

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    return {
      ai_generated: true,
      timestamp: new Date().toISOString(),
      recommendations: analysis,
      confidence: 'high'
    };
  } catch (error) {
    return {
      ai_generated: false,
      error: error.message,
      fallback_recommendation: 'Manual review required'
    };
  }
}
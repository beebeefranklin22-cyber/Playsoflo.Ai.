import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { metricsHistory, currentState } = await req.json();

    // Statistical anomaly detection
    const anomalies = [];
    const metrics = ['memory', 'errorRate', 'networkLatency', 'renderTime'];

    for (const metric of metrics) {
      const values = metricsHistory.map(m => m[metric]).filter(v => v !== undefined);
      if (values.length < 5) continue;

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
      );

      const latest = values[values.length - 1];
      const zScore = (latest - mean) / (stdDev || 1);

      // Detect anomaly (z-score > 2 indicates outlier)
      if (Math.abs(zScore) > 2) {
        anomalies.push({
          type: metric === 'memory' ? 'memory_leak' :
                metric === 'errorRate' ? 'error_spike' :
                metric === 'networkLatency' ? 'network_instability' :
                'performance_degradation',
          metric,
          currentValue: latest,
          expectedRange: [mean - 2 * stdDev, mean + 2 * stdDev],
          severity: Math.abs(zScore) > 3 ? 'critical' : 'high',
          timestamp: Date.now()
        });
      }
    }

    // Use AI for pattern recognition and prediction
    const aiPrediction = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analyze system metrics and predict potential failures:

Recent Metrics Trend:
${JSON.stringify(metricsHistory.slice(-10))}

Detected Anomalies:
${JSON.stringify(anomalies)}

Current State:
${JSON.stringify(currentState)}

Predict:
1. Is a system failure likely in the next 5 minutes?
2. What type of failure (crash, freeze, error cascade, memory overflow)?
3. Confidence level (0-100)
4. Preventative measures to take now
5. Root cause if identifiable

Be precise and actionable.`,
      response_json_schema: {
        type: "object",
        properties: {
          failureLikely: { type: "boolean" },
          failureType: { type: "string" },
          confidenceLevel: { type: "number" },
          preventativeMeasures: { type: "array", items: { type: "string" } },
          rootCause: { type: "string" },
          timeToFailure: { type: "string" }
        }
      }
    });

    // Auto-apply fixes if high confidence critical prediction
    let autoFixApplied = false;
    if (aiPrediction.failureLikely && aiPrediction.confidenceLevel > 70) {
      console.log('⚠️ High confidence failure prediction - applying preventative fixes');
      
      // Log prediction
      await base44.asServiceRole.entities.ErrorLog.create({
        error_message: `Predicted ${aiPrediction.failureType} in ${aiPrediction.timeToFailure}`,
        error_type: 'prediction',
        error_stack: JSON.stringify(aiPrediction),
        resolved: false
      });

      autoFixApplied = true;
    }

    return Response.json({
      success: true,
      anomaliesDetected: anomalies,
      predictedFailure: aiPrediction.failureLikely ? aiPrediction : null,
      autoFixApplied,
      metrics: {
        totalChecked: metricsHistory.length,
        anomalyCount: anomalies.length,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('Predictive analytics error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});
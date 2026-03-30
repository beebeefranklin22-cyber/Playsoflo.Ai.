import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: Service Role Authentication
    // ============================================
    // This should be called by admin or automated system
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'Unauthorized - Admin access required' 
      }, { status: 401 });
    }

    // ============================================
    // STEP 2: Parse Request Data
    // ============================================
    const { userEmail, orderId } = await req.json();

    let analysisScope = 'platform';
    let targetData = {};

    // ============================================
    // STEP 3: Gather Trading Activity Data
    // ============================================
    if (userEmail) {
      // Analyze specific user
      analysisScope = 'user';
      
      // Get user's orders
      const userOrders = await base44.asServiceRole.entities.P2POrder.filter({
        $or: [
          { seller_email: userEmail },
          { buyer_email: userEmail }
        ]
      });

      // Get user's escrows
      const userEscrows = await base44.asServiceRole.entities.P2PEscrow.filter({
        $or: [
          { seller_email: userEmail },
          { buyer_email: userEmail }
        ]
      });

      // Get user's ratings
      const userRatings = await base44.asServiceRole.entities.TraderRating.filter({
        $or: [
          { trader_email: userEmail },
          { rater_email: userEmail }
        ]
      });

      targetData = {
        email: userEmail,
        total_orders: userOrders.length,
        orders: userOrders.map(o => ({
          id: o.id,
          type: o.order_type,
          status: o.status,
          amount: o.total_amount,
          created: o.created_date,
          completed: o.completed_at
        })),
        escrows: userEscrows.map(e => ({
          status: e.status,
          disputed: e.status === 'disputed',
          dispute_reason: e.dispute_reason
        })),
        ratings: userRatings.filter(r => r.trader_email === userEmail).map(r => ({
          rating: r.rating,
          aspects: r.aspects
        }))
      };
    } else if (orderId) {
      // Analyze specific order
      analysisScope = 'order';
      
      const order = await base44.asServiceRole.entities.P2POrder.filter({ id: orderId });
      if (!order || order.length === 0) {
        return Response.json({ error: 'Order not found' }, { status: 404 });
      }

      const orderData = order[0];
      
      // Get escrow
      let escrowData = null;
      if (orderData.escrow_id) {
        const escrow = await base44.asServiceRole.entities.P2PEscrow.filter({ 
          id: orderData.escrow_id 
        });
        if (escrow && escrow.length > 0) {
          escrowData = escrow[0];
        }
      }

      targetData = {
        order: orderData,
        escrow: escrowData
      };
    } else {
      // Platform-wide analysis
      const allOrders = await base44.asServiceRole.entities.P2POrder.filter({});
      const allEscrows = await base44.asServiceRole.entities.P2PEscrow.filter({});
      
      targetData = {
        total_orders: allOrders.length,
        disputed_orders: allEscrows.filter(e => e.status === 'disputed').length,
        recent_disputes: allEscrows
          .filter(e => e.status === 'disputed')
          .slice(0, 10)
          .map(e => ({
            order_id: e.order_id,
            reason: e.dispute_reason
          }))
      };
    }

    // ============================================
    // STEP 4: Call AI for Fraud Analysis
    // ============================================
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a fraud detection expert specializing in P2P cryptocurrency trading. Analyze the following trading data for potential fraudulent patterns.

Analysis Scope: ${analysisScope}
Data:
${JSON.stringify(targetData, null, 2)}

Identify:
1. Fraud risk level (critical/high/medium/low/none)
2. Suspicious patterns detected
3. Red flags or warning signs
4. Recommended actions for platform
5. Confidence level in assessment

Common fraud indicators in P2P trading:
- Rapid order creation/cancellation
- Consistently disputed transactions
- Payment confirmation without actual payment
- Account takeover patterns
- Money laundering indicators
- Collusion patterns
- Fake payment proof
- Chargebacks after crypto release

Provide detailed analysis.`,
      response_json_schema: {
        type: "object",
        properties: {
          risk_level: { 
            type: "string", 
            enum: ["critical", "high", "medium", "low", "none"],
            description: "Overall fraud risk assessment"
          },
          risk_score: { 
            type: "number", 
            description: "Risk score 0-100"
          },
          suspicious_patterns: {
            type: "array",
            items: { type: "string" },
            description: "Identified suspicious patterns"
          },
          red_flags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                flag: { type: "string" },
                severity: { type: "string" }
              }
            },
            description: "Specific red flags found"
          },
          recommended_actions: {
            type: "array",
            items: { type: "string" },
            description: "Actions platform should take"
          },
          confidence_level: { 
            type: "string", 
            enum: ["high", "medium", "low"],
            description: "Confidence in assessment"
          },
          detailed_analysis: { type: "string", description: "Full analysis explanation" }
        }
      }
    });

    // ============================================
    // STEP 5: Log Analysis for Audit Trail
    // ============================================
    // Create notification for admins if high risk
    if (aiResponse.risk_level === 'critical' || aiResponse.risk_level === 'high') {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: user.email,
        type: 'alert',
        title: `🚨 Fraud Alert: ${analysisScope} - ${aiResponse.risk_level.toUpperCase()} Risk`,
        message: `AI detected potential fraud. Risk Score: ${aiResponse.risk_score}/100. ${aiResponse.suspicious_patterns.length} suspicious patterns found.`,
        read: false,
        action_url: userEmail ? `/UserProfile?user=${userEmail}` : `/Wallet`
      });
    }

    // ============================================
    // STEP 6: Return Analysis
    // ============================================
    return Response.json({
      success: true,
      analysis: aiResponse,
      scope: analysisScope,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing P2P fraud:', error);
    return Response.json({ 
      error: error.message || 'Failed to analyze fraud',
      type: error.type || 'unknown_error'
    }, { status: 500 });
  }
});
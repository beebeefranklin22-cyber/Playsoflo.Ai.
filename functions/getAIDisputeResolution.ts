import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // ============================================
    // STEP 1: Authenticate User
    // ============================================
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ============================================
    // STEP 2: Parse Request Data
    // ============================================
    const { orderId, disputeReason, userRole } = await req.json();

    if (!orderId || !disputeReason) {
      return Response.json({ 
        error: 'Missing required fields: orderId, disputeReason' 
      }, { status: 400 });
    }

    // ============================================
    // STEP 3: Fetch Order and Escrow Details
    // ============================================
    const order = await base44.asServiceRole.entities.P2POrder.filter({ id: orderId });
    if (!order || order.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = order[0];

    // Get escrow if exists
    let escrowData = null;
    if (orderData.escrow_id) {
      const escrow = await base44.asServiceRole.entities.P2PEscrow.filter({ 
        id: orderData.escrow_id 
      });
      if (escrow && escrow.length > 0) {
        escrowData = escrow[0];
      }
    }

    // ============================================
    // STEP 4: Prepare Context for AI Analysis
    // ============================================
    const disputeContext = {
      order: {
        type: orderData.order_type,
        crypto_currency: orderData.crypto_currency,
        crypto_amount: orderData.crypto_amount,
        total_amount: orderData.total_amount,
        payment_methods: orderData.payment_methods,
        status: orderData.status,
        created_date: orderData.created_date
      },
      escrow: escrowData ? {
        status: escrowData.status,
        payment_confirmed_at: escrowData.payment_confirmed_at,
        crypto_locked_at: escrowData.crypto_locked_at
      } : null,
      dispute: {
        reason: disputeReason,
        reported_by: userRole || 'user'
      }
    };

    // ============================================
    // STEP 5: Call AI for Dispute Analysis
    // ============================================
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a P2P trading dispute resolution expert. Analyze the following dispute case and provide recommendations.

Dispute Details:
${JSON.stringify(disputeContext, null, 2)}

Provide:
1. Assessment of the dispute severity (critical/high/medium/low)
2. Likely cause based on the information
3. Recommended next steps for resolution
4. Suggested evidence to collect
5. Potential outcomes (fair resolution scenarios)
6. Timeline estimate for resolution

Consider:
- Order timeline and payment confirmation status
- Escrow status and crypto lock status
- Common dispute patterns in P2P trading
- Platform policies and best practices
- Fair outcomes for both parties`,
      response_json_schema: {
        type: "object",
        properties: {
          severity: { 
            type: "string", 
            enum: ["critical", "high", "medium", "low"],
            description: "Dispute severity level"
          },
          likely_cause: { type: "string", description: "Most probable cause of dispute" },
          recommended_steps: {
            type: "array",
            items: { type: "string" },
            description: "Ordered list of steps to take"
          },
          evidence_needed: {
            type: "array",
            items: { type: "string" },
            description: "Evidence that should be collected"
          },
          potential_outcomes: {
            type: "array",
            items: { 
              type: "object",
              properties: {
                scenario: { type: "string" },
                likelihood: { type: "string" }
              }
            },
            description: "Possible resolution scenarios"
          },
          resolution_timeline: { type: "string", description: "Expected time to resolve" },
          buyer_action: { type: "string", description: "What buyer should do" },
          seller_action: { type: "string", description: "What seller should do" }
        }
      }
    });

    // ============================================
    // STEP 6: Return AI Analysis
    // ============================================
    return Response.json({
      success: true,
      analysis: aiResponse,
      order_id: orderId,
      context: disputeContext
    });

  } catch (error) {
    console.error('Error getting AI dispute resolution:', error);
    return Response.json({ 
      error: error.message || 'Failed to get dispute analysis',
      type: error.type || 'unknown_error'
    }, { status: 500 });
  }
});
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
    // STEP 3.5: Fetch Chat History
    // ============================================
    const chatConversations = await base44.asServiceRole.entities.ChatConversation.filter({
      participants: { $in: [orderData.seller_email, orderData.buyer_email] }
    });

    const chatMessages = [];
    for (const conv of chatConversations) {
      const messages = await base44.asServiceRole.entities.ChatMessage.filter({
        conversation_id: conv.id
      });
      chatMessages.push(...messages.slice(-20)); // Last 20 messages
    }

    const chatSummary = chatMessages.map(m => ({
      sender: m.sender_email,
      timestamp: m.created_date,
      hasAttachments: m.attachments && m.attachments.length > 0
    }));

    // ============================================
    // STEP 3.6: Analyze User Behavior
    // ============================================
    const sellerHistory = await base44.asServiceRole.entities.P2POrder.filter({
      seller_email: orderData.seller_email,
      status: 'completed'
    });

    const buyerHistory = await base44.asServiceRole.entities.P2POrder.filter({
      buyer_email: orderData.buyer_email,
      status: 'completed'
    });

    const sellerRatings = await base44.asServiceRole.entities.TraderRating.filter({
      trader_email: orderData.seller_email
    });

    const buyerRatings = await base44.asServiceRole.entities.TraderRating.filter({
      trader_email: orderData.buyer_email
    });

    const sellerDisputes = await base44.asServiceRole.entities.P2PEscrow.filter({
      seller_email: orderData.seller_email,
      status: 'disputed'
    });

    const buyerDisputes = await base44.asServiceRole.entities.P2PEscrow.filter({
      buyer_email: orderData.buyer_email,
      status: 'disputed'
    });

    const userBehavior = {
      seller: {
        total_completed: sellerHistory.length,
        avg_rating: sellerRatings.length > 0 
          ? sellerRatings.reduce((sum, r) => sum + r.rating, 0) / sellerRatings.length 
          : 0,
        dispute_count: sellerDisputes.length,
        account_age_days: Math.floor((Date.now() - new Date(orderData.seller_email).getTime()) / (1000 * 60 * 60 * 24))
      },
      buyer: {
        total_completed: buyerHistory.length,
        avg_rating: buyerRatings.length > 0 
          ? buyerRatings.reduce((sum, r) => sum + r.rating, 0) / buyerRatings.length 
          : 0,
        dispute_count: buyerDisputes.length,
        account_age_days: Math.floor((Date.now() - new Date(orderData.buyer_email).getTime()) / (1000 * 60 * 60 * 24))
      }
    };

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
        created_date: orderData.created_date,
        time_limit_minutes: orderData.time_limit_minutes
      },
      escrow: escrowData ? {
        status: escrowData.status,
        payment_confirmed_at: escrowData.payment_confirmed_at,
        crypto_locked_at: escrowData.crypto_locked_at,
        dispute_evidence: escrowData.dispute_evidence || []
      } : null,
      dispute: {
        reason: disputeReason,
        reported_by: userRole || 'user'
      },
      chat_activity: {
        total_messages: chatMessages.length,
        last_message_time: chatMessages.length > 0 
          ? chatMessages[chatMessages.length - 1].created_date 
          : null,
        messages_with_attachments: chatSummary.filter(m => m.hasAttachments).length
      },
      user_behavior: userBehavior
    };

    // ============================================
    // STEP 5: Call AI for Dispute Analysis
    // ============================================
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert P2P trading dispute resolution specialist with access to comprehensive case data. Analyze this dispute thoroughly.

**Dispute Context:**
${JSON.stringify(disputeContext, null, 2)}

**Your Analysis Should Include:**

1. **Severity Assessment** (critical/high/medium/low)
   - Consider: order value, user history, evidence availability, time sensitivity

2. **Root Cause Analysis**
   - What likely happened based on timeline, chat activity, and user behavior?
   - Are there red flags suggesting fraud or misunderstanding?

3. **User Credibility Assessment**
   - Seller: ${userBehavior.seller.total_completed} trades, ${userBehavior.seller.avg_rating.toFixed(1)} rating, ${userBehavior.seller.dispute_count} disputes
   - Buyer: ${userBehavior.buyer.total_completed} trades, ${userBehavior.buyer.avg_rating.toFixed(1)} rating, ${userBehavior.buyer.dispute_count} disputes
   - Who appears more credible based on history?

4. **Evidence Requirements**
   - What specific evidence should each party provide?
   - What would conclusively resolve this case?

5. **Communication Pattern Analysis**
   - ${chatMessages.length} messages exchanged
   - ${chatSummary.filter(m => m.hasAttachments).length} attachments shared
   - Any suspicious patterns?

6. **Resolution Pathways**
   - Best case resolution
   - Compromise scenarios
   - Escalation triggers

7. **Timeline & Next Steps**
   - Immediate actions for both parties
   - Expected resolution timeframe
   - When to escalate to manual review

Consider P2P trading best practices, fraud patterns, and fair dispute resolution principles.`,
      response_json_schema: {
        type: "object",
        properties: {
          severity: { 
            type: "string", 
            enum: ["critical", "high", "medium", "low"],
            description: "Dispute severity level"
          },
          confidence_score: {
            type: "number",
            description: "Confidence in analysis (0-100)"
          },
          likely_cause: { type: "string", description: "Most probable cause of dispute" },
          credibility_assessment: {
            type: "object",
            properties: {
              seller_credibility: { type: "string", enum: ["high", "medium", "low"] },
              buyer_credibility: { type: "string", enum: ["high", "medium", "low"] },
              analysis: { type: "string" }
            }
          },
          recommended_steps: {
            type: "array",
            items: { type: "string" },
            description: "Ordered list of steps to take"
          },
          evidence_needed: {
            type: "object",
            properties: {
              from_seller: { type: "array", items: { type: "string" } },
              from_buyer: { type: "array", items: { type: "string" } },
              critical_evidence: { type: "array", items: { type: "string" } }
            }
          },
          red_flags: {
            type: "array",
            items: { type: "string" },
            description: "Suspicious patterns or concerns"
          },
          potential_outcomes: {
            type: "array",
            items: { 
              type: "object",
              properties: {
                scenario: { type: "string" },
                likelihood: { type: "string" },
                fair_to_both: { type: "boolean" }
              }
            },
            description: "Possible resolution scenarios"
          },
          resolution_timeline: { type: "string", description: "Expected time to resolve" },
          buyer_action: { type: "string", description: "What buyer should do immediately" },
          seller_action: { type: "string", description: "What seller should do immediately" },
          admin_action: { type: "string", description: "What admin should investigate" },
          fraud_risk: {
            type: "string",
            enum: ["none", "low", "medium", "high"],
            description: "Likelihood of fraudulent activity"
          }
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
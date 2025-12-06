import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rental_id, damage_report_index } = await req.json();

    if (!rental_id || damage_report_index === undefined) {
      return Response.json({ error: 'rental_id and damage_report_index are required' }, { status: 400 });
    }

    // Get rental and damage report
    const rentals = await base44.asServiceRole.entities.CarRental.filter({ id: rental_id });
    
    if (rentals.length === 0) {
      return Response.json({ error: 'Rental not found' }, { status: 404 });
    }

    const rental = rentals[0];
    const damageReport = rental.damages_reported?.[damage_report_index];

    if (!damageReport) {
      return Response.json({ error: 'Damage report not found' }, { status: 404 });
    }

    // Get historical damage data for similar cases
    const allRentals = await base44.asServiceRole.entities.CarRental.list();
    const historicalDamages = allRentals
      .filter(r => r.damages_reported && r.damages_reported.length > 0)
      .flatMap(r => r.damages_reported.map(d => ({
        description: d.description,
        estimated_cost: d.estimated_cost,
        severity: d.severity
      })));

    // AI Analysis with historical context
    const analysisPrompt = `You are an expert auto damage claims adjuster with access to thousands of historical claims.

CURRENT DAMAGE REPORT:
Description: ${damageReport.description}
Initial Estimate: $${damageReport.estimated_cost || 0}
Reported by: ${damageReport.reported_by}
Vehicle: ${rental.car_make} ${rental.car_model} (${rental.car_year || 'Unknown year'})

HISTORICAL CLAIMS DATA:
You have access to ${historicalDamages.length} previous damage claims. Here are some similar cases:
${historicalDamages.slice(0, 10).map(h => `- "${h.description}" | Cost: $${h.estimated_cost} | Severity: ${h.severity}`).join('\n')}

INSURANCE POLICY DETAILS:
- Full coverage included
- Deductible: $250
- Coverage limit: $50,000
- Minor damage threshold: $1,000

TASK: Analyze this damage claim and provide:
1. Accurate severity classification
2. Fair repair cost estimate based on market rates and historical data
3. Suggested settlement amount (considering depreciation, betterment, and fair market value)
4. Confidence score (0-100) in your assessment
5. Whether this qualifies as "minor" (auto-resolvable) or needs escalation
6. Detailed reasoning for your recommendation

Consider:
- Typical repair costs for this vehicle type
- Age and condition of damaged parts
- Whether damage was pre-existing
- Fair depreciation/betterment adjustments
- Historical settlement patterns`;

    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls: damageReport.photos?.slice(0, 5) || [],
      response_json_schema: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["minor", "moderate", "major"] },
          estimated_repair_cost: { type: "number" },
          suggested_settlement: { type: "number" },
          settlement_breakdown: {
            type: "object",
            properties: {
              repair_cost: { type: "number" },
              depreciation_adjustment: { type: "number" },
              administrative_fee: { type: "number" }
            }
          },
          confidence_score: { type: "number" },
          similar_cases_found: { type: "number" },
          reasoning: { type: "string" },
          auto_resolvable: { type: "boolean" },
          escalation_reason: { type: "string" }
        }
      }
    });

    // Determine if this is auto-resolvable (minor claim)
    const isMinor = aiAnalysis.severity === "minor" && 
                    aiAnalysis.suggested_settlement <= 1000 &&
                    aiAnalysis.confidence_score >= 70;

    // Create settlement proposal
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 3); // 3 days to respond

    const settlement = await base44.asServiceRole.entities.DamageSettlement.create({
      rental_id,
      damage_report_index,
      renter_email: rental.renter_email,
      provider_email: rental.provider_email,
      damage_description: damageReport.description,
      ai_analysis: {
        severity: aiAnalysis.severity,
        estimated_repair_cost: aiAnalysis.estimated_repair_cost,
        confidence_score: aiAnalysis.confidence_score,
        similar_cases_found: aiAnalysis.similar_cases_found || 0,
        reasoning: aiAnalysis.reasoning
      },
      suggested_settlement: aiAnalysis.suggested_settlement,
      settlement_breakdown: aiAnalysis.settlement_breakdown,
      status: "proposed",
      auto_resolve_deadline: deadlineDate.toISOString(),
      resolution_method: isMinor ? "ai_automated" : null
    });

    // Notify both parties
    const notificationMessage = `🤖 AI Settlement Proposal

Damage: ${damageReport.description}

AI Analysis:
- Severity: ${aiAnalysis.severity.toUpperCase()}
- Repair Cost: $${aiAnalysis.estimated_repair_cost}
- Suggested Settlement: $${aiAnalysis.suggested_settlement}
- Confidence: ${aiAnalysis.confidence_score}%

${aiAnalysis.reasoning}

${isMinor ? '✅ This qualifies for automated resolution. Both parties have 72 hours to respond.' : '⚠️ This case requires manual review due to complexity or cost.'}`;

    await base44.asServiceRole.entities.Notification.create({
      recipient_email: rental.renter_email,
      type: 'dispute_opened',
      title: '🤖 AI Settlement Proposed',
      message: notificationMessage,
      reference_type: 'booking',
      reference_id: rental_id
    });

    await base44.asServiceRole.entities.Notification.create({
      recipient_email: rental.provider_email,
      type: 'dispute_opened',
      title: '🤖 AI Settlement Proposed',
      message: notificationMessage,
      reference_type: 'booking',
      reference_id: rental_id
    });

    // Send to conversation
    if (rental.conversation_id) {
      await base44.asServiceRole.entities.ChatMessage.create({
        conversation_id: rental.conversation_id,
        sender_email: 'system',
        content: notificationMessage,
        message_type: 'text'
      });
    }

    // If not minor, escalate immediately
    if (!isMinor) {
      await base44.asServiceRole.entities.DamageSettlement.update(settlement.id, {
        status: 'escalated',
        escalated_reason: aiAnalysis.escalation_reason || 'Exceeds minor claim threshold or low confidence'
      });

      // Update dispute to needs admin review
      const disputes = await base44.asServiceRole.entities.Dispute.filter({
        reference_id: rental_id,
        reference_type: 'booking'
      });
      
      if (disputes.length > 0) {
        await base44.asServiceRole.entities.Dispute.update(disputes[0].id, {
          status: 'under_review'
        });
      }
    }

    return Response.json({
      success: true,
      settlement,
      ai_analysis: aiAnalysis,
      is_minor: isMinor,
      auto_resolve_enabled: isMinor,
      deadline: deadlineDate.toISOString()
    });

  } catch (error) {
    console.error('Damage resolution error:', error);
    return Response.json({ 
      error: error.message || 'Failed to resolve damage claim' 
    }, { status: 500 });
  }
});
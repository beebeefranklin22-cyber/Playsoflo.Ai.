import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { settlement_id, response, counter_offer } = await req.json();

    if (!settlement_id || !response) {
      return Response.json({ error: 'settlement_id and response are required' }, { status: 400 });
    }

    // Get settlement
    const settlements = await base44.asServiceRole.entities.DamageSettlement.filter({ id: settlement_id });
    
    if (settlements.length === 0) {
      return Response.json({ error: 'Settlement not found' }, { status: 404 });
    }

    const settlement = settlements[0];

    // Verify user is either renter or provider
    const isRenter = settlement.renter_email === user.email;
    const isProvider = settlement.provider_email === user.email;

    if (!isRenter && !isProvider) {
      return Response.json({ error: 'Unauthorized to respond to this settlement' }, { status: 403 });
    }

    // Update settlement with response
    const updateData = {};
    
    if (isRenter) {
      updateData.renter_response = response;
      if (counter_offer) updateData.renter_counter_offer = counter_offer;
      if (response === 'accepted') updateData.status = settlement.provider_response === 'accepted' ? 'both_accepted' : 'renter_accepted';
      if (response === 'disputed') updateData.status = 'renter_disputed';
    } else {
      updateData.provider_response = response;
      if (counter_offer) updateData.provider_counter_offer = counter_offer;
      if (response === 'accepted') updateData.status = settlement.renter_response === 'accepted' ? 'both_accepted' : 'provider_accepted';
      if (response === 'disputed') updateData.status = 'provider_disputed';
    }

    await base44.asServiceRole.entities.DamageSettlement.update(settlement_id, updateData);

    const updatedSettlement = await base44.asServiceRole.entities.DamageSettlement.filter({ id: settlement_id });
    const current = updatedSettlement[0];

    // Check if both parties accepted
    if (current.status === 'both_accepted') {
      // Auto-resolve: Process payment from renter's deposit
      await base44.asServiceRole.entities.CarRental.update(settlement.rental_id, {
        deposit_status: 'released',
        status: 'completed'
      });

      await base44.asServiceRole.entities.DamageSettlement.update(settlement_id, {
        final_settlement_amount: settlement.suggested_settlement,
        resolution_method: 'ai_automated',
        resolved_at: new Date().toISOString()
      });

      // Create payment record
      await base44.asServiceRole.entities.Payment.create({
        amount_usd: settlement.suggested_settlement,
        method: 'bank',
        status: 'completed',
        reference_type: 'escrow',
        reference_id: settlement.rental_id,
        memo: `Damage settlement: ${settlement.damage_description.substring(0, 50)}`
      });

      // Update dispute to resolved
      const disputes = await base44.asServiceRole.entities.Dispute.filter({
        reference_id: settlement.rental_id
      });
      
      if (disputes.length > 0) {
        await base44.asServiceRole.entities.Dispute.update(disputes[0].id, {
          status: 'resolved',
          resolution: `AI-automated settlement of $${settlement.suggested_settlement} accepted by both parties`
        });
      }

      // Notify both parties
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: settlement.renter_email,
        type: 'dispute_resolved',
        title: '✅ Settlement Completed',
        message: `Damage claim resolved automatically. Settlement of $${settlement.suggested_settlement} processed.`,
        reference_type: 'booking',
        reference_id: settlement.rental_id
      });

      await base44.asServiceRole.entities.Notification.create({
        recipient_email: settlement.provider_email,
        type: 'dispute_resolved',
        title: '✅ Settlement Completed',
        message: `Damage claim resolved. Payment of $${settlement.suggested_settlement} processed.`,
        reference_type: 'booking',
        reference_id: settlement.rental_id
      });

      return Response.json({
        success: true,
        message: 'Settlement auto-resolved successfully',
        settlement_amount: settlement.suggested_settlement,
        resolution_method: 'ai_automated'
      });
    }

    // Check if either party disputed
    if (current.status === 'renter_disputed' || current.status === 'provider_disputed') {
      // Escalate to admin review
      await base44.asServiceRole.entities.DamageSettlement.update(settlement_id, {
        status: 'escalated',
        escalated_reason: response === 'disputed' 
          ? `${isRenter ? 'Renter' : 'Provider'} disputed AI settlement suggestion`
          : 'Counter-offer submitted, needs review'
      });

      // Notify admin (in real app, would notify admin users)
      console.log('Settlement escalated for admin review:', settlement_id);

      return Response.json({
        success: true,
        message: 'Settlement disputed and escalated to admin review',
        status: 'escalated'
      });
    }

    // Notify other party of acceptance
    const otherParty = isRenter ? settlement.provider_email : settlement.renter_email;
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: otherParty,
      type: 'system_alert',
      title: '⏳ Waiting for Response',
      message: `${isRenter ? 'Renter' : 'Provider'} has ${response === 'accepted' ? 'accepted' : 'responded to'} the AI settlement proposal. Your response is needed.`,
      reference_type: 'booking',
      reference_id: settlement.rental_id
    });

    return Response.json({
      success: true,
      message: 'Response recorded. Waiting for other party.',
      settlement: current
    });

  } catch (error) {
    console.error('Settlement response error:', error);
    return Response.json({ 
      error: error.message || 'Failed to process settlement response' 
    }, { status: 500 });
  }
});
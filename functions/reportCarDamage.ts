
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rental_id, description, photos, estimated_cost } = await req.json();

    if (!rental_id || !description) {
      return Response.json({ error: 'rental_id and description are required' }, { status: 400 });
    }

    // Get rental record
    const rentals = await base44.asServiceRole.entities.CarRental.filter({ id: rental_id });
    
    if (rentals.length === 0) {
      return Response.json({ error: 'Rental not found' }, { status: 404 });
    }

    const rental = rentals[0];

    // Verify user is either renter or provider
    if (rental.renter_email !== user.email && rental.provider_email !== user.email) {
      return Response.json({ error: 'Unauthorized to report damage for this rental' }, { status: 403 });
    }

    // Quick damage assessment without AI (to avoid timeout)
    const estimatedCost = estimated_cost || 0;
    const severity = estimatedCost > 1000 ? 'major' : estimatedCost > 300 ? 'moderate' : 'minor';

    // Add damage report to rental
    const damageReport = {
      description,
      photos: photos || [],
      estimated_cost: estimatedCost,
      reported_by: user.email,
      reported_at: new Date().toISOString(),
      severity
    };

    const existingDamages = rental.damages_reported || [];
    const damageIndex = existingDamages.length;
    
    await base44.asServiceRole.entities.CarRental.update(rental_id, {
      damages_reported: [...existingDamages, damageReport],
      status: 'disputed'
    });

    // Notify the other party
    const otherParty = user.email === rental.renter_email ? rental.provider_email : rental.renter_email;
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: otherParty,
      type: 'dispute_opened',
      title: '⚠️ Damage Reported',
      message: `${user.email === rental.renter_email ? 'Renter' : 'Provider'} has reported damage: ${description}`,
      reference_type: 'booking',
      reference_id: rental_id
    });

    // Send message in conversation
    if (rental.conversation_id) {
      await base44.asServiceRole.entities.ChatMessage.create({
        conversation_id: rental.conversation_id,
        sender_email: user.email,
        content: `⚠️ DAMAGE REPORT:\n${description}\n\nEstimated cost: $${estimatedCost}\nSeverity: ${severity}`,
        message_type: 'text'
      });
    }

    // Create dispute record for admin review
    await base44.asServiceRole.entities.Dispute.create({
      reference_type: 'booking',
      reference_id: rental_id,
      complainant_email: user.email,
      respondent_email: otherParty,
      reason: 'quality_issue',
      description: `Damage reported: ${description}`,
      evidence_urls: photos || [],
      status: 'open',
      amount_disputed: estimatedCost
    });

    // Trigger AI settlement resolution asynchronously (call another function)
    // Don't await to avoid timeout - it will process in background
    base44.asServiceRole.functions.invoke('resolveMinorDamage', {
      rental_id,
      damage_report_index: damageIndex
    }).catch(err => console.error('Background AI resolution error:', err));

    return Response.json({
      success: true,
      damage_report: damageReport,
      damage_index: damageIndex,
      message: 'Damage reported successfully. AI is analyzing for automated resolution.'
    });

  } catch (error) {
    console.error('Damage reporting error:', error);
    return Response.json({ 
      error: error.message || 'Failed to report damage' 
    }, { status: 500 });
  }
});

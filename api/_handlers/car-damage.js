import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';
import { damageAnalysis } from '../_lib/damageAnalysis.js';

// Backs reportCarDamage and respondToSettlement for the car rental damage
// arbitration flow.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const admin = getSupabaseAdmin();
  const { action } = req.body || {};

  try {
    if (action === 'report') return res.status(200).json(await reportDamage(admin, user, req.body));
    if (action === 'respond') return res.status(200).json(await respondToSettlement(admin, user, req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('car-damage error:', action, err);
    return res.status(200).json({ error: err.message });
  }
}

async function reportDamage(admin, user, { rental_id, description, photos, estimated_cost }) {
  const { data: rental, error: rentalError } = await admin.from('car_rentals').select('*').eq('id', rental_id).single();
  if (rentalError || !rental) throw new Error('Rental not found');
  if (rental.renter_email !== user.email && rental.provider_email !== user.email) {
    throw new Error('You are not part of this rental');
  }

  let ai_analysis = null;
  // Cap the AI's suggestion (and the renter's own estimate) at the
  // rental's disclosed security deposit -- the deposit is the contractual
  // maximum a renter can be charged for damage, enforced again below when
  // a settlement is actually accepted.
  const depositCap = rental.security_deposit > 0 ? rental.security_deposit : Infinity;
  let suggested_settlement = Math.min(estimated_cost, depositCap);
  try {
    const aiData = await damageAnalysis({ description, estimated_cost, photos });
    if (aiData?.suggested_settlement != null) {
      suggested_settlement = Math.min(aiData.suggested_settlement, depositCap);
    }
    ai_analysis = aiData;
  } catch (aiError) {
    console.error('Damage AI analysis failed, defaulting to renter estimate:', aiError);
  }

  const { data: settlement, error } = await admin
    .from('damage_settlements')
    .insert({
      rental_id,
      renter_email: rental.renter_email,
      owner_email: rental.provider_email,
      damage_description: description,
      photos: photos || [],
      estimated_cost,
      suggested_settlement,
      settlement_amount: suggested_settlement,
      ai_analysis,
      status: 'proposed',
      renter_response: 'pending',
      provider_response: 'pending',
    })
    .select()
    .single();
  if (error) throw error;

  const otherParty = user.email === rental.renter_email ? rental.provider_email : rental.renter_email;
  await notify(admin, otherParty, 'damage_settlement', 'Damage Reported',
    `A damage settlement of $${suggested_settlement.toFixed(2)} has been proposed for your rental. Please review and respond.`, settlement.id);

  return { settlement };
}

async function respondToSettlement(admin, user, { settlement_id, response, counter_offer }) {
  const { data: settlement, error: fetchError } = await admin.from('damage_settlements').select('*').eq('id', settlement_id).single();
  if (fetchError || !settlement) throw new Error('Settlement not found');
  const isOwner = settlement.owner_email === user.email;
  const isRenter = settlement.renter_email === user.email;
  if (!isOwner && !isRenter) throw new Error('You are not part of this settlement');
  if (settlement.status !== 'proposed') throw new Error(`This settlement is already ${settlement.status}`);

  const responseField = isOwner ? 'provider_response' : 'renter_response';
  const otherResponse = isOwner ? settlement.renter_response : settlement.provider_response;

  if (response === 'disputed') {
    const { data: updated, error } = await admin
      .from('damage_settlements')
      .update({ [responseField]: 'disputed', status: 'escalated', escalated_reason: `${isOwner ? 'Provider' : 'Renter'} disputed the proposed settlement.`, counter_offer: counter_offer || null })
      .eq('id', settlement_id)
      .select()
      .single();
    if (error) throw error;

    const otherParty = isOwner ? settlement.renter_email : settlement.owner_email;
    await notify(admin, otherParty, 'damage_settlement', 'Damage Settlement Disputed',
      'The other party disputed the proposed damage settlement. This has been escalated for manual review.', settlement_id);
    return { settlement: updated };
  }

  if (response !== 'accepted') throw new Error(`Unknown response "${response}"`);

  // Only move money once BOTH parties have accepted.
  if (otherResponse !== 'accepted') {
    const { data: updated, error } = await admin
      .from('damage_settlements')
      .update({ [responseField]: 'accepted' })
      .eq('id', settlement_id)
      .select()
      .single();
    if (error) throw error;
    return { settlement: updated };
  }

  // Cap at the rental's disclosed security deposit -- a renter can never
  // be charged more than that through this flow.
  const { data: rental } = await admin.from('car_rentals').select('security_deposit').eq('id', settlement.rental_id).single();
  const depositCap = rental?.security_deposit > 0 ? rental.security_deposit : Infinity;
  const amount = Math.min(settlement.settlement_amount || 0, depositCap);

  if (amount > 0) {
    const { error: moveError } = await admin.rpc('wallet_move', {
      p_from_email: settlement.renter_email,
      p_to_email: settlement.owner_email,
      p_debit_amount: amount,
      p_credit_amount: amount,
      p_reference_type: 'damage_settlement',
      p_reference_id: settlement_id,
      p_memo: null,
    });
    if (moveError) {
      if (String(moveError.message).includes('insufficient balance')) throw new Error('Insufficient balance to cover the settlement');
      throw moveError;
    }
  }

  const { data: updated, error } = await admin
    .from('damage_settlements')
    .update({ [responseField]: 'accepted', status: 'both_accepted', final_settlement_amount: amount, resolved_at: new Date().toISOString() })
    .eq('id', settlement_id)
    .select()
    .single();
  if (error) throw error;

  if (amount > 0) {
    await admin.from('car_rentals').update({ deposit_status: 'claimed' }).eq('id', settlement.rental_id);
  }

  const otherParty = isOwner ? settlement.renter_email : settlement.owner_email;
  await notify(admin, otherParty, 'damage_settlement', 'Damage Settlement Resolved',
    `Both parties accepted the $${amount.toFixed(2)} damage settlement.`, settlement_id);

  return { settlement: updated };
}

async function notify(admin, recipientEmail, type, title, message, referenceId) {
  if (!recipientEmail) return;
  const { error } = await admin.from('notifications').insert({
    recipient_email: recipientEmail, type, title, message, reference_type: 'damage_settlement', reference_id: referenceId, read: false,
  });
  if (error) console.error('Failed to create notification:', error);
}

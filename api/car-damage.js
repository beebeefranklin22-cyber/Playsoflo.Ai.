import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireUser } from './_lib/auth.js';
import { damageAnalysis } from './_lib/damageAnalysis.js';

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
  let suggested_settlement = estimated_cost;
  try {
    const aiData = await damageAnalysis({ description, estimated_cost, photos });
    if (aiData?.suggested_settlement != null) {
      suggested_settlement = aiData.suggested_settlement;
      ai_analysis = aiData.reasoning;
    }
  } catch (aiError) {
    console.error('Damage AI analysis failed, defaulting to renter estimate:', aiError);
  }

  const { data: settlement, error } = await admin
    .from('damage_settlements')
    .insert({
      rental_id,
      renter_email: rental.renter_email,
      owner_email: rental.provider_email,
      description,
      photos: photos || [],
      estimated_cost,
      suggested_settlement,
      settlement_amount: suggested_settlement,
      ai_analysis,
      status: 'pending_owner_review',
    })
    .select()
    .single();
  if (error) throw error;

  return { settlement };
}

async function respondToSettlement(admin, user, { settlement_id, response, counter_offer }) {
  const { data: settlement, error: fetchError } = await admin.from('damage_settlements').select('*').eq('id', settlement_id).single();
  if (fetchError || !settlement) throw new Error('Settlement not found');
  if (settlement.owner_email !== user.email && settlement.renter_email !== user.email) {
    throw new Error('You are not part of this settlement');
  }

  if (response === 'accepted') {
    // The renter's deposit already covers this in most real setups; here
    // it's modeled as a direct transfer from renter to owner for the
    // agreed amount.
    const amount = counter_offer ?? settlement.settlement_amount;
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
    const { error } = await admin
      .from('damage_settlements')
      .update({ status: 'resolved', owner_response: response, resolved_at: new Date().toISOString() })
      .eq('id', settlement_id);
    if (error) throw error;
  } else {
    const { error } = await admin
      .from('damage_settlements')
      .update({ status: 'disputed', owner_response: response, counter_offer: counter_offer || null })
      .eq('id', settlement_id);
    if (error) throw error;
  }

  return { success: true };
}

import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';
import { CREDIT_FEE_RATES, round2 } from '../_lib/orderHelpers.js';

// Backs processCollaborativeRevenue. This is the actual payment collection
// for a PPV purchase (the frontend only creates a purchase record and
// bumps stats beforehand — no money moves until this runs), split among
// the primary creator and any collaborators recorded in revenue_shares.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { contentId, totalAmount, purchaseId } = req.body || {};
  const admin = getSupabaseAdmin();

  try {
    const { data: content, error: contentError } = await admin.from('ppv_contents').select('*').eq('id', contentId).single();
    if (contentError || !content) throw new Error('Content not found');

    const { data: shares } = await admin.from('revenue_shares').select('*').eq('content_id', contentId);
    const collaboratorTotal = (shares || []).reduce((s, r) => s + (r.share_percent || 0), 0);
    const creatorPercent = Math.max(0, 100 - collaboratorTotal);

    const amount = Number(totalAmount);
    if (!amount || amount <= 0) throw new Error('totalAmount must be a positive number');

    // Same platform fee as any other PPV purchase (CREDIT_FEE_RATES.ppv) --
    // this used to split 100% of the charge between creator and
    // collaborators with no platform cut at all, unlike every other PPV
    // purchase path.
    const platformFeeRate = CREDIT_FEE_RATES.ppv ?? 0.20;
    const netAmount = round2(amount * (1 - platformFeeRate));

    // First split: debit the buyer for the full amount, credit the
    // primary creator their share of the post-fee net, in one atomic step.
    const creatorAmount = Math.round(netAmount * (creatorPercent / 100) * 100) / 100;
    const { error: moveError } = await admin.rpc('wallet_move', {
      p_from_email: user.email,
      p_to_email: content.creator_email,
      p_debit_amount: amount,
      p_credit_amount: creatorAmount,
      p_reference_type: 'ppv_purchase',
      p_reference_id: purchaseId,
      p_memo: null,
    });
    if (moveError) {
      if (String(moveError.message).includes('insufficient balance')) throw new Error('Insufficient wallet balance');
      throw moveError;
    }

    // Remaining splits: pure credits to each collaborator (the money was
    // already collected from the buyer above).
    for (const share of shares || []) {
      const collaboratorAmount = Math.round(netAmount * ((share.share_percent || 0) / 100) * 100) / 100;
      if (collaboratorAmount <= 0) continue;
      const { error: creditError } = await admin.rpc('wallet_move', {
        p_from_email: null,
        p_to_email: share.creator_email,
        p_debit_amount: null,
        p_credit_amount: collaboratorAmount,
        p_reference_type: 'ppv_revenue_share',
        p_reference_id: purchaseId,
        p_memo: null,
      });
      if (creditError) console.error('Failed to credit collaborator', share.creator_email, creditError);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('processCollaborativeRevenue error:', err);
    return res.status(200).json({ success: false, error: err.message });
  }
}

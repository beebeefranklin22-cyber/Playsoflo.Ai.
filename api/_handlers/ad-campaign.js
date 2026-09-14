import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';
import { createCheckoutSession, retrieveCheckoutSession } from '../_lib/stripe.js';

// Backs createAdCampaign/confirmAdCampaign. AdsManager.jsx used to call a
// Supabase Edge Function that doesn't exist anywhere in this repo (no
// supabase/functions/ directory at all) -- "Create & Pay" either failed
// outright or, worse, relied on the client redirecting itself to
// `?payment=success&campaign_id=X` and calling asServiceRole.update()
// (not a real privilege bypass, just the same authenticated client) to
// flip status to 'active' with NO verification a payment ever happened.
// Combined with ad_campaigns_update_own's RLS letting the advertiser
// update their own row directly, any signed-in user could activate any
// of their own pending campaigns for free. This handler creates a real
// Stripe Checkout Session and only activates a campaign after
// independently verifying payment with Stripe; migration 0038 also locks
// the `status` column so only this server-verified path (or an explicit
// pause/resume toggle) can move a campaign in or out of pending_payment.
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
    if (action === 'create') return res.status(200).json(await handleCreate(admin, user, req.body));
    if (action === 'confirm') return res.status(200).json(await handleConfirm(admin, req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('ad-campaign error:', action, err);
    return res.status(400).json({ error: err.message || 'Ad campaign request failed' });
  }
}

async function handleCreate(admin, user, body) {
  const {
    campaign_name, objective, ad_format, placements, media_urls, headline, description,
    call_to_action, destination_url, targeting, budget_type, budget_amount, bid_strategy, schedule,
    origin,
  } = body;

  if (!campaign_name || !headline || !media_urls?.length) {
    throw new Error('campaign_name, headline, and at least one media_url are required');
  }
  const budget = Number(budget_amount);
  if (!budget || budget < 5) throw new Error('Minimum budget is $5');

  // Matches the "Initial Charge" copy already shown in AdsManager.jsx:
  // 7 days upfront for a daily budget, or the full lifetime budget.
  const chargeAmount = budget_type === 'daily' ? Math.round(budget * 7 * 100) / 100 : budget;

  const { data: campaign, error: insertError } = await admin
    .from('ad_campaigns')
    .insert({
      advertiser_email: user.email,
      campaign_name, objective, ad_format, placements, media_urls, headline, description,
      call_to_action, destination_url, targeting, budget_type, budget_amount: budget, bid_strategy, schedule,
      status: 'pending_payment',
    })
    .select()
    .single();
  if (insertError) throw insertError;

  const origin_safe = typeof origin === 'string' && origin.startsWith('http') ? origin : '';
  const session = await createCheckoutSession({
    amountCents: Math.round(chargeAmount * 100),
    productName: `PlaySoFlo Ad Campaign: ${campaign_name}`,
    successUrl: `${origin_safe}/AdsManager?payment=pending&campaign_id=${campaign.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin_safe}/AdsManager?payment=cancelled&campaign_id=${campaign.id}`,
    metadata: { campaign_id: campaign.id, advertiser_email: user.email },
  });

  return { checkout_url: session.url, campaign_id: campaign.id };
}

async function handleConfirm(admin, { campaign_id, session_id }) {
  if (!campaign_id || !session_id) throw new Error('campaign_id and session_id are required');

  const { data: campaign, error: fetchError } = await admin
    .from('ad_campaigns')
    .select('id, status')
    .eq('id', campaign_id)
    .single();
  if (fetchError || !campaign) throw new Error('Campaign not found');

  if (campaign.status === 'active') return { success: true, already_active: true };
  if (campaign.status !== 'pending_payment') throw new Error(`Campaign is not awaiting payment (status: ${campaign.status})`);

  const session = await retrieveCheckoutSession(session_id);
  if (session.metadata?.campaign_id !== campaign_id) throw new Error('Session does not match this campaign');
  if (session.payment_status !== 'paid') throw new Error(`Payment not completed (status: ${session.payment_status})`);

  const { error: updateError } = await admin
    .from('ad_campaigns')
    .update({ status: 'active' })
    .eq('id', campaign_id);
  if (updateError) throw updateError;

  return { success: true };
}

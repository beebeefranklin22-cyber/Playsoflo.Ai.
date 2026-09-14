import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';
import { createExpressAccount, createAccountLink, retrieveConnectedAccount, createLoginLink } from '../_lib/stripe.js';

// Backs the "Connect Stripe Account" buttons across provider/wellness/
// affiliate onboarding (createConnectedAccount + createAccountLink), which
// previously had no backend implementation at all -- every click threw
// `base44.functions.invoke("createConnectedAccount") has no backend
// implementation yet.` immediately. Also backs the account-status check
// used before a real withdrawal payout (see handleWithdraw in wallet.js).
//
// Express accounts: Stripe hosts identity verification and bank-account
// collection during onboarding, so this app never touches or stores raw
// bank details -- only the resulting stripe_account_id.
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
    if (action === 'create_account') return res.status(200).json(await createAccount(admin, user, req.body));
    if (action === 'create_account_link') return res.status(200).json(await createLink(admin, user, req.body));
    if (action === 'account_status') return res.status(200).json(await accountStatus(admin, user));
    if (action === 'create_login_link') return res.status(200).json(await createDashboardLink(admin, user));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('connect action error:', action, err);
    return res.status(400).json({ error: err.message });
  }
}

// Creates (or reuses) the caller's own Express account -- never lets a
// client specify whose account to create/link, since stripe_account_id is
// looked up from the verified caller's own profile row throughout.
async function createAccount(admin, user, body) {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single();
  if (profileError) throw profileError;

  if (profile?.stripe_account_id) {
    return { account_id: profile.stripe_account_id };
  }

  const account = await createExpressAccount({
    email: user.email,
    businessName: body.businessName || undefined,
    country: body.country || 'US',
  });

  const { error: updateError } = await admin
    .from('profiles')
    .update({ stripe_account_id: account.id })
    .eq('id', user.id);
  if (updateError) throw updateError;

  return { account_id: account.id };
}

async function createLink(admin, user, body) {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single();
  if (profileError) throw profileError;
  if (!profile?.stripe_account_id) throw new Error('No connected account yet -- call create_account first');

  const link = await createAccountLink({
    accountId: profile.stripe_account_id,
    refreshUrl: body.refreshUrl || body.returnUrl,
    returnUrl: body.returnUrl,
  });
  return { url: link.url };
}

async function accountStatus(admin, user) {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single();
  if (profileError) throw profileError;
  if (!profile?.stripe_account_id) return { connected: false };

  const account = await retrieveConnectedAccount(profile.stripe_account_id);
  return {
    connected: true,
    account_id: account.id,
    details_submitted: !!account.details_submitted,
    charges_enabled: !!account.charges_enabled,
    payouts_enabled: !!account.payouts_enabled,
    requirements: account.requirements || null,
  };
}

async function createDashboardLink(admin, user) {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single();
  if (profileError) throw profileError;
  if (!profile?.stripe_account_id) throw new Error('No connected account yet');

  const link = await createLoginLink(profile.stripe_account_id);
  return { url: link.url };
}

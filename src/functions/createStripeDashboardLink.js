import { callSecureApi } from '@/lib/apiClient';

// account_id is accepted (StripeExpressDashboard.jsx passes it) but unused
// server-side -- the login link is always generated for the verified
// caller's own stored stripe_account_id.
export async function createStripeDashboardLink({ account_id, accountId } = {}) {
  const data = await callSecureApi('/api/connect', { action: 'create_login_link' });
  return { data: { success: true, url: data.url } };
}

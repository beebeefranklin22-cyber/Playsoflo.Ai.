import { callSecureApi } from '@/lib/apiClient';

// See createConnectedAccount.js for why this normalizes both parameter
// naming styles and the response shape across all nine call sites. Note
// accountId/account_id is accepted but never actually used server-side --
// the onboarding link is always generated for the verified caller's own
// stored stripe_account_id, never a client-supplied account id.
export async function createAccountLink({ accountId, account_id, returnUrl, return_url, refreshUrl, refresh_url } = {}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const resolvedReturnUrl = returnUrl || return_url || origin;
  const data = await callSecureApi('/api/connect', {
    action: 'create_account_link',
    returnUrl: resolvedReturnUrl,
    refreshUrl: refreshUrl || refresh_url || resolvedReturnUrl,
  });
  return { data: { success: true, url: data.url } };
}

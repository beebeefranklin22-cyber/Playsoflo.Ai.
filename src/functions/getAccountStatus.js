import { callSecureApi } from '@/lib/apiClient';

// See createConnectedAccount.js -- account_id is accepted (every call site
// passes it) but unused server-side; status is always checked against the
// verified caller's own stored stripe_account_id.
export async function getAccountStatus({ account_id, accountId } = {}) {
  const data = await callSecureApi('/api/connect', { action: 'account_status' });
  return { data };
}

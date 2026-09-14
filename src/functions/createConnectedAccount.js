import { callSecureApi } from '@/lib/apiClient';

// Backs every "Connect Stripe Account" button across provider/wellness/
// affiliate onboarding, which previously had no backend implementation at
// all (base44.functions.invoke threw "has no backend implementation yet"
// immediately). The nine call sites across this app disagree on parameter
// names (businessName vs business_type, camelCase vs snake_case) and on
// what shape the response comes back in (response.data.accountId vs
// response.data.account_id, some checking response.data.success) -- rather
// than touch nine files individually, this wrapper accepts either input
// style and returns a response shape every one of them already handles.
export async function createConnectedAccount({ email, businessName, business_type, country } = {}) {
  const data = await callSecureApi('/api/connect', {
    action: 'create_account',
    // email/business_type aren't used server-side -- the account is always
    // created for the verified caller's own email, never a client-supplied one.
    businessName: businessName || undefined,
    country: country || 'US',
  });
  return { data: { success: true, accountId: data.account_id, account_id: data.account_id } };
}

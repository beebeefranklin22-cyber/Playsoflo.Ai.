import { callSecureApi } from '@/lib/apiClient';

// api/setup-intent.js requires an authenticated caller (it attaches the
// SetupIntent to that user's own Stripe Customer), so this must go through
// callSecureApi rather than a bare fetch.
export async function createSetupIntent() {
  try {
    const data = await callSecureApi('/api/setup-intent', {});
    return { data };
  } catch (error) {
    return { data: { error: error.message } };
  }
}

import { callSecureApi } from '@/lib/apiClient';

// The purchase amount (price minus any membership discount) is resolved
// entirely server-side from the content's real price and the caller's
// actual membership status -- not accepted from here, since trusting a
// client-supplied amount previously let any PPV content be unlocked for
// whatever the client claimed it cost.
export async function processCollaborativeRevenue({ purchaseId, contentId } = {}) {
  const data = await callSecureApi('/api/collaborative-revenue', { purchaseId, contentId });
  return { data };
}

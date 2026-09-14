import { callSecureApi } from '@/lib/apiClient';

// Creates the campaign row (status: pending_payment) and a real Stripe
// Checkout Session for it -- this used to call a Supabase Edge Function
// that doesn't exist anywhere in this repo.
export async function createAdCampaign(data) {
  const result = await callSecureApi('/api/ad-campaign', {
    action: 'create',
    ...data,
    origin: window.location.origin,
  });
  return { data: result };
}

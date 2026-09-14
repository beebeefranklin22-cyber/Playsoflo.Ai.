import { callSecureApi } from '@/lib/apiClient';

// Activates a campaign only after the server independently verifies the
// Stripe Checkout Session actually paid -- replaces the old pattern of
// trusting a `?payment=success` URL param and flipping status to 'active'
// client-side with no verification at all.
export async function confirmAdCampaign({ campaign_id, session_id } = {}) {
  const result = await callSecureApi('/api/ad-campaign', { action: 'confirm', campaign_id, session_id });
  return { data: result };
}

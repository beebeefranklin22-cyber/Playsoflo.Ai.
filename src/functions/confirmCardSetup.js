import { callSecureApi } from '@/lib/apiClient';

// Finalizes "add a card": call after stripe.confirmSetup() succeeds
// client-side, passing back the SetupIntent id so the server can verify it
// really succeeded (never trust the client) before persisting the saved
// payment method.
export async function confirmCardSetup({ setup_intent_id } = {}) {
  try {
    const data = await callSecureApi('/api/payment-methods', { action: 'confirm_card', setup_intent_id });
    return { data };
  } catch (error) {
    return { data: { error: error.message } };
  }
}

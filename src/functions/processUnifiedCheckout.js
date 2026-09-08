import { callSecureApi } from '@/lib/apiClient';

// Backs UnifiedBookingModal's checkout flow for every order_type. Called up
// to three ways by the modal: wallet (one call, done), stripe-initiate (no
// confirm_payment_intent_id yet — returns client_secret to show the Stripe
// form), and stripe-finalize (confirm_payment_intent_id set after the
// customer confirms on the Stripe form — creates the order).
export async function processUnifiedCheckout(params = {}) {
  try {
    const data = await callSecureApi('/api/checkout', params);
    return { data };
  } catch (error) {
    console.error('processUnifiedCheckout error:', error);
    return { data: { error: error.message } };
  }
}

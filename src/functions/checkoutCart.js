import { callSecureApi } from '@/lib/apiClient';

// Backs Cart.jsx's "Proceed to Checkout" button. Called up to two ways:
// wallet (one call, done), or stripe (no confirm_payment_intent_id yet —
// returns client_secret to show the Stripe form, then called again with
// confirm_payment_intent_id once the customer confirms).
export async function checkoutCart(params = {}) {
  try {
    const data = await callSecureApi('/api/cart-checkout', params);
    return { data };
  } catch (error) {
    console.error('checkoutCart error:', error);
    return { data: { error: error.message } };
  }
}

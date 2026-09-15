import { callSecureApi } from '@/lib/apiClient';

// Credits recipient_email's wallet for a Stripe-paid tip/purchase — the
// server re-verifies the PaymentIntent with Stripe itself before crediting
// anything, is idempotent per payment_intent_id, and resolves the platform
// fee itself from reference_type (CREDIT_FEE_RATES in api/_lib/orderHelpers.js)
// rather than trusting a rate from the caller.
export async function creditWalletFromPayment({ payment_intent_id, recipient_email, reference_type, booking_id } = {}) {
  const data = await callSecureApi('/api/wallet', {
    action: 'credit_from_payment',
    payment_intent_id,
    recipient_email,
    reference_type,
    booking_id,
  });
  return { data };
}

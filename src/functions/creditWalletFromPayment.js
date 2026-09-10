import { callSecureApi } from '@/lib/apiClient';

// Credits recipient_email's wallet for a Stripe-paid tip/purchase — the
// server re-verifies the PaymentIntent with Stripe itself before crediting
// anything, and is idempotent per payment_intent_id.
export async function creditWalletFromPayment({ payment_intent_id, recipient_email, reference_type, fee_rate } = {}) {
  const data = await callSecureApi('/api/wallet', {
    action: 'credit_from_payment',
    payment_intent_id,
    recipient_email,
    reference_type,
    fee_rate,
  });
  return { data };
}

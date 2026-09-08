import { supabase } from '@/lib/supabaseClient';

// Stores display metadata only (last4, brand, expiry) — never a full card
// or bank account number, which the caller has already truncated before
// this is invoked. This isn't a real Stripe tokenization integration (no
// charge can actually be made against a row saved here yet); it backs the
// "saved payment methods" list UI.
export async function savePaymentMethod({ direct_card, manual_bank } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: { error: 'You must be signed in' } };

  const row = direct_card
    ? { type: 'card', ...direct_card }
    : { type: 'bank', ...manual_bank };

  const { data: method, error } = await supabase
    .from('payment_methods')
    .insert({ user_email: session.user.email, status: 'active', details: row })
    .select()
    .single();

  if (error) return { data: { error: error.message } };
  return { data: { method } };
}

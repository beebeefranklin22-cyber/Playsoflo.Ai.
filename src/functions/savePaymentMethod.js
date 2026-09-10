import { supabase } from '@/lib/supabaseClient';

// Saving a card goes through a real Stripe SetupIntent instead (see
// createSetupIntent.js + confirmCardSetup.js + api/payment-methods.js) —
// this only handles a manually-entered bank account, which isn't charged
// through Stripe and so has no tokenization step. Stores display metadata
// only (last4, bank name) — never a full account number, which the caller
// has already truncated before this is invoked.
export async function savePaymentMethod({ manual_bank } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: { error: 'You must be signed in' } };
  if (!manual_bank) return { data: { error: 'manual_bank is required' } };

  const { data: existing, error: existingError } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('user_email', session.user.email)
    .eq('status', 'active');
  if (existingError) return { data: { error: existingError.message } };

  const { data: method, error } = await supabase
    .from('payment_methods')
    .insert({
      user_email: session.user.email,
      type: 'bank_account',
      status: 'active',
      is_default: !existing || existing.length === 0,
      bank_details: manual_bank,
    })
    .select()
    .single();

  if (error) return { data: { error: error.message } };
  return { data: { method } };
}

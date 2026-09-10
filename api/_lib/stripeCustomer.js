import { createCustomer } from './stripe.js';

// Every user needs exactly one Stripe Customer to save/reuse a card
// against. Cached on profiles.stripe_customer_id after first creation.
export async function getOrCreateStripeCustomer(admin, user) {
  const { data: profile, error } = await admin
    .from('profiles')
    .select('stripe_customer_id, full_name')
    .eq('email', user.email)
    .single();
  if (error) throw error;
  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await createCustomer({ email: user.email, name: profile?.full_name });

  const { error: updateError } = await admin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('email', user.email);
  if (updateError) throw updateError;

  return customer.id;
}

import { supabase } from '@/lib/supabaseClient';

// Simple interest accrual: amount * apy/100/365 * days elapsed since the
// last calculation, applied per active stake the signed-in user owns.
export async function calculateStakingRewards() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: { updated: 0 } };

  const { data: stakes, error } = await supabase
    .from('stakings')
    .select('*')
    .eq('user_email', session.user.email)
    .eq('status', 'active');
  if (error || !stakes?.length) return { data: { updated: 0 } };

  const now = new Date();
  let updated = 0;
  for (const stake of stakes) {
    const since = new Date(stake.last_reward_calculated_at || stake.start_date || stake.created_at);
    const days = (now - since) / 86400000;
    if (days < 1 / 24) continue; // don't bother for sub-hour gaps
    const newRewards = (stake.amount || 0) * ((stake.apy || 0) / 100 / 365) * days;
    if (newRewards <= 0) continue;

    await supabase
      .from('stakings')
      .update({
        accumulated_rewards: (stake.accumulated_rewards || 0) + newRewards,
        last_reward_calculated_at: now.toISOString(),
      })
      .eq('id', stake.id);
    updated += 1;
  }

  return { data: { updated } };
}

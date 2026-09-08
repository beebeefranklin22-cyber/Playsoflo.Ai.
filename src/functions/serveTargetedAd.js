import { supabase } from '@/lib/supabaseClient';

export async function serveTargetedAd({ position, exclude_ids = [] } = {}) {
  let q = supabase.from('ad_campaigns').select('*').eq('status', 'active');
  if (position) q = q.eq('target_position', position);
  if (exclude_ids.length) q = q.not('id', 'in', `(${exclude_ids.join(',')})`);

  const { data, error } = await q.limit(1).maybeSingle();
  if (error) return { data: { ad: null } };
  return { data: { ad: data || null } };
}

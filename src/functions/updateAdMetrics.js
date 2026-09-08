import { supabase } from '@/lib/supabaseClient';

// Best-effort view/click counters — a lost increment under concurrent
// requests is an acceptable tradeoff for ad analytics (unlike money).
export async function updateAdMetrics({ campaign_id, event_type } = {}) {
  const column = event_type === 'click' ? 'clicks' : 'impressions';
  const { data: campaign, error: fetchError } = await supabase
    .from('ad_campaigns')
    .select(column)
    .eq('id', campaign_id)
    .single();
  if (fetchError) return { data: { error: fetchError.message } };

  const { error } = await supabase
    .from('ad_campaigns')
    .update({ [column]: (campaign[column] || 0) + 1 })
    .eq('id', campaign_id);
  if (error) return { data: { error: error.message } };
  return { data: { success: true } };
}

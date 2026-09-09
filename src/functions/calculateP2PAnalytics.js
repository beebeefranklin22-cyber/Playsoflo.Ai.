import { supabase } from '@/lib/supabaseClient';

export async function calculateP2PAnalytics({ userEmail } = {}) {
  const { data: orders } = await supabase
    .from('p2p_orders')
    .select('*')
    .or(`buyer_email.eq.${userEmail},seller_email.eq.${userEmail}`);

  const rows = orders || [];
  const completed = rows.filter((o) => o.status === 'completed');
  const asBuyer = rows.filter((o) => o.buyer_email === userEmail);
  const asSeller = rows.filter((o) => o.seller_email === userEmail);
  const totalVolume = completed.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  return {
    data: {
      analytics: {
        total_orders: rows.length,
        completed_orders: completed.length,
        total_volume_usd: Math.round(totalVolume * 100) / 100,
        orders_as_buyer: asBuyer.length,
        orders_as_seller: asSeller.length,
        completion_rate: rows.length ? Math.round((completed.length / rows.length) * 100) : 0,
      },
    },
  };
}

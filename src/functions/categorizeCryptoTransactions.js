import { supabase } from '@/lib/supabaseClient';

// Rule-based categorization by the transaction's own recorded type — more
// reliable than an LLM guessing categories for numeric transaction data.
export async function categorizeCryptoTransactions({ time_period } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: { data: { categories: {} } } };

  const limit = Number(time_period) || 50;
  const { data: transactions } = await supabase
    .from('crypto_transactions')
    .select('*')
    .eq('user_email', session.user.email)
    .order('created_at', { ascending: false })
    .limit(limit);

  const categories = {};
  (transactions || []).forEach((t) => {
    const key = t.transaction_type || 'other';
    if (!categories[key]) categories[key] = { count: 0, total_usd: 0 };
    categories[key].count += 1;
    categories[key].total_usd += Number(t.usd_value || t.amount_usd || 0);
  });

  return { data: { data: { categories, transaction_count: (transactions || []).length } } };
}

import { supabase } from '@/lib/supabaseClient';

export async function generateTaxReport({ taxYear } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: { error: 'You must be signed in' } };
  const userEmail = session.user.email;

  const yearStart = `${taxYear}-01-01T00:00:00.000Z`;
  const yearEnd = `${taxYear}-12-31T23:59:59.999Z`;

  const { data: transactions } = await supabase
    .from('wallet_transactions')
    .select('*')
    .or(`user_email.eq.${userEmail},counterparty_email.eq.${userEmail}`)
    .gte('created_at', yearStart)
    .lte('created_at', yearEnd);

  const rows = (transactions || []).filter((t) => t.user_email === userEmail);
  const totalIncome = rows.filter((t) => t.direction === 'credit').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = rows.filter((t) => t.direction === 'debit').reduce((s, t) => s + Number(t.amount), 0);

  const { data: report, error } = await supabase
    .from('tax_reports')
    .insert({
      user_email: userEmail,
      transaction_details: {
        tax_year: taxYear,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net: totalIncome - totalExpenses,
        transaction_count: rows.length,
        transactions: rows,
      },
    })
    .select()
    .single();

  if (error) return { data: { error: error.message } };
  return { data: { report } };
}

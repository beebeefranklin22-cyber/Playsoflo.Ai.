import { supabase } from '@/lib/supabaseClient';

export async function createSupportTicket({ subject, category } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be signed in');

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({ subject, category: category || 'general', user_email: session.user.email, status: 'open' })
    .select()
    .single();
  if (error) throw error;
  return { ticket };
}

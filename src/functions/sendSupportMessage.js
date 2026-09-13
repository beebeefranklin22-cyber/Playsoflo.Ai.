import { supabase } from '@/lib/supabaseClient';

export async function sendSupportMessage({ ticket_id, message, attachments } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be signed in');

  const { data: row, error } = await supabase
    .from('support_messages')
    .insert({
      ticket_id,
      message,
      attachments: attachments || [],
      sender_email: session.user.email,
      sender_type: 'customer',
      is_internal: false,
    })
    .select()
    .single();
  if (error) throw error;
  return { data: row };
}

import { supabase } from '@/lib/supabaseClient';

// Best-effort click logging; always resolves so the caller can still open
// the ticket URL even if logging fails.
export async function trackTicketClick({ event_id, event_name, ticket_url } = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('user_interactions').insert({
      user_email: session?.user?.email || null,
      interaction_type: 'ticket_click',
      target_id: event_id,
      metadata: { event_name, ticket_url },
    });
  } catch (error) {
    console.error('trackTicketClick logging failed:', error);
  }
  return { data: { tracking_url: ticket_url } };
}

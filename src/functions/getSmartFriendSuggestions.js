import { supabase } from '@/lib/supabaseClient';

// Friend-of-friend suggestions ranked by mutual friend count — no AI
// needed, just a graph traversal over the existing friendships table.
export async function getSmartFriendSuggestions({ limit = 20 } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: { suggestions: [] } };
  const myEmail = session.user.email;

  const { data: myFriendships } = await supabase
    .from('friendships')
    .select('user1_email, user2_email')
    .or(`user1_email.eq.${myEmail},user2_email.eq.${myEmail}`)
    .eq('status', 'active');

  const myFriends = new Set(
    (myFriendships || []).map((f) => (f.user1_email === myEmail ? f.user2_email : f.user1_email))
  );
  if (myFriends.size === 0) return { data: { suggestions: [] } };

  const { data: theirFriendships } = await supabase
    .from('friendships')
    .select('user1_email, user2_email')
    .or([...myFriends].flatMap((e) => [`user1_email.eq.${e}`, `user2_email.eq.${e}`]).join(','))
    .eq('status', 'active');

  const mutualCount = {};
  (theirFriendships || []).forEach((f) => {
    [f.user1_email, f.user2_email].forEach((email) => {
      if (email !== myEmail && !myFriends.has(email)) {
        mutualCount[email] = (mutualCount[email] || 0) + 1;
      }
    });
  });

  const candidateEmails = Object.entries(mutualCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([email]) => email);

  if (candidateEmails.length === 0) return { data: { suggestions: [] } };

  const { data: profiles } = await supabase.from('profiles').select('*').in('email', candidateEmails);
  const suggestions = (profiles || []).map((p) => ({ ...p, mutual_friends_count: mutualCount[p.email] || 0 }));

  return { data: { suggestions } };
}

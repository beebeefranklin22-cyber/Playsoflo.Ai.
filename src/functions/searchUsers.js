import { supabase } from '@/lib/supabaseClient';

// Looks users up by id, or does a fuzzy username/full_name search.
// Returns { data: { users: [...] } } to match how callers across the app
// read the result (`res.data?.users || res.users`).
export async function searchUsers({ query, id } = {}) {
  try {
    let q = supabase.from('profiles').select('*');

    if (id) {
      q = q.eq('id', id);
    } else if (query?.trim()) {
      const term = `%${query.trim()}%`;
      q = q.or(`username.ilike.${term},full_name.ilike.${term}`);
    } else {
      return { data: { users: [] } };
    }

    const { data, error } = await q.limit(20);
    if (error) throw error;
    return { data: { users: data ?? [] } };
  } catch (error) {
    console.error('searchUsers error:', error);
    return { data: { users: [] }, error: error.message };
  }
}

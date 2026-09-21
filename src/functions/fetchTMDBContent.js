import { callSecureApi } from '@/lib/apiClient';

// Registered under this exact name so base44.functions.invoke('fetchTMDBContent', ...)
// in TMDBMovieBrowser.jsx resolves to a real implementation. TMDBMovieBrowser
// calls this from a react-query queryFn without checking isError, so this
// resolves with an empty result set on failure rather than throwing into an
// unhandled query-error state.
export async function fetchTMDBContent({ type, page, query, genre_id } = {}) {
  try {
    const data = await callSecureApi('/api/tmdb', { action: 'fetch_content', type, page, query, genre_id });
    return { data };
  } catch (error) {
    return { data: { results: [], total_pages: 1, error: error.message } };
  }
}

import { callSecureApi } from '@/lib/apiClient';

// Registered under this exact name so base44.functions.invoke('getTMDBDetails', ...)
// in TMDBMovieBrowser.jsx resolves to a real implementation. The caller
// already wraps this in its own try/catch, so this throws normally on failure.
export async function getTMDBDetails({ tmdb_id, type } = {}) {
  const data = await callSecureApi('/api/tmdb', { action: 'get_details', tmdb_id, type });
  return { data };
}

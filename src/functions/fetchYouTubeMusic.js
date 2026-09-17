import { callSecureApi } from '@/lib/apiClient';

// Registered under this exact name so base44.functions.invoke('fetchYouTubeMusic', ...)
// in Vibe.jsx resolves to a real implementation instead of throwing
// "has no backend implementation yet" (see functionsMap in base44Client.js).
export async function fetchYouTubeMusic({ query, maxResults } = {}) {
  try {
    const result = await callSecureApi('/api/youtube-music', { query, maxResults });
    return { data: { tracks: result.tracks || [] } };
  } catch (error) {
    return { data: { tracks: [], error: error.message } };
  }
}

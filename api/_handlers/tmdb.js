import { requireUser } from '../_lib/auth.js';

// TMDBMovieBrowser.jsx (Streaming page's "Browse Movies & Shows") called
// base44.functions.invoke('fetchTMDBContent'/'getTMDBDetails', ...) with no
// backend behind either, so browsing always failed. Backed by the real
// TMDB (The Movie Database) API v3, gated behind TMDB_API_KEY.
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';

function getTmdbKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    const err = new Error('Movie/TV browsing is not configured yet');
    err.statusCode = 503;
    throw err;
  }
  return key;
}

async function tmdbRequest(path, params = {}) {
  const query = new URLSearchParams({ ...params, api_key: getTmdbKey() });
  const res = await fetch(`${TMDB_BASE}${path}?${query.toString()}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.status_message || `TMDB request failed (${res.status})`);
    err.statusCode = res.status >= 500 ? 502 : 400;
    throw err;
  }
  return json;
}

function imageUrl(path, size) {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

function toSummary(item, type) {
  return {
    tmdb_id: item.id,
    title: item.title || item.name,
    thumbnail_url: imageUrl(item.poster_path, 'w500'),
    rating: item.vote_average,
    release_date: item.release_date || item.first_air_date || null,
    type,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { action } = req.body || {};

  try {
    if (action === 'fetch_content') return res.status(200).json(await handleFetchContent(req.body));
    if (action === 'get_details') return res.status(200).json(await handleGetDetails(req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('tmdb action error:', action, err);
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
}

async function handleFetchContent({ type, page, query, genre_id }) {
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const pageNum = Math.max(1, Math.min(500, Number(page) || 1));

  const data = (query || '').trim()
    ? await tmdbRequest(`/search/${mediaType}`, { query: query.trim(), page: pageNum, include_adult: false })
    : await tmdbRequest(`/discover/${mediaType}`, {
        page: pageNum,
        sort_by: 'popularity.desc',
        ...(genre_id ? { with_genres: genre_id } : {}),
      });

  return {
    results: (data.results || []).map((item) => toSummary(item, mediaType)),
    total_pages: data.total_pages || 1,
  };
}

async function handleGetDetails({ tmdb_id, type }) {
  if (!tmdb_id) throw new Error('tmdb_id is required');
  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const data = await tmdbRequest(`/${mediaType}/${tmdb_id}`, { append_to_response: 'credits,videos' });

  const trailer = (data.videos?.results || []).find((v) => v.site === 'YouTube' && v.type === 'Trailer')
    || (data.videos?.results || []).find((v) => v.site === 'YouTube');

  const runtimeMinutes = mediaType === 'movie' ? data.runtime : (data.episode_run_time || [])[0];

  return {
    tmdb_id: data.id,
    title: data.title || data.name,
    thumbnail_url: imageUrl(data.poster_path, 'w500'),
    backdrop_url: imageUrl(data.backdrop_path, 'w1280'),
    rating: data.vote_average,
    duration: runtimeMinutes ? `${runtimeMinutes} min` : null,
    release_date: data.release_date || data.first_air_date || null,
    genres: (data.genres || []).map((g) => g.name),
    description: data.overview,
    cast: (data.credits?.cast || []).slice(0, 8).map((c) => c.name),
    trailer: trailer ? { key: trailer.key } : null,
  };
}

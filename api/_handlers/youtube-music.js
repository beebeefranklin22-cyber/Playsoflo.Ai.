import { requireUser } from '../_lib/auth.js';

// Music Hub's search (src/pages/Vibe.jsx) is meant to combine the
// platform's own uploaded catalog with YouTube results, but the client
// referenced base44.functions.invoke('fetchYouTubeMusic', ...) with no
// backend behind it, so every search silently fell back to platform-only
// results (see functionsMap in base44Client.js -- an unregistered name
// throws "has no backend implementation yet", caught by Vibe.jsx's
// try/catch). This is the real implementation, backed by the YouTube Data
// API v3 (https://developers.google.com/youtube/v3/docs/search/list).
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

function getYouTubeKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    const err = new Error('YouTube search is not configured yet');
    err.statusCode = 503;
    throw err;
  }
  return key;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { query, maxResults } = req.body || {};
  if (!query || !query.trim()) return res.status(200).json({ success: true, tracks: [] });

  try {
    const limit = Math.max(1, Math.min(25, Number(maxResults) || 20));
    const key = getYouTubeKey();

    const searchUrl =
      `${YOUTUBE_API_BASE}/search?part=snippet&type=video&videoCategoryId=10` +
      `&maxResults=${limit}&q=${encodeURIComponent(query.trim())}&key=${key}`;
    const searchRes = await fetch(searchUrl);
    const searchJson = await searchRes.json().catch(() => ({}));
    if (!searchRes.ok) {
      const message = searchJson?.error?.message || `YouTube search failed (${searchRes.status})`;
      const err = new Error(message);
      err.statusCode = searchRes.status >= 500 ? 502 : 400;
      throw err;
    }

    const items = (searchJson.items || []).filter((item) => item.id?.videoId);
    const videoIds = items.map((item) => item.id.videoId).join(',');

    // A second call (videos.list) gets real view counts for the popularity
    // badge the UI already renders (track.popularity) -- search.list alone
    // doesn't return statistics.
    let statsById = {};
    if (videoIds) {
      const statsUrl = `${YOUTUBE_API_BASE}/videos?part=statistics&id=${videoIds}&key=${key}`;
      const statsRes = await fetch(statsUrl);
      const statsJson = await statsRes.json().catch(() => ({}));
      if (statsRes.ok) {
        statsById = Object.fromEntries(
          (statsJson.items || []).map((v) => [v.id, Number(v.statistics?.viewCount) || 0])
        );
      }
    }

    const tracks = items.map((item) => {
      const videoId = item.id.videoId;
      const snippet = item.snippet || {};
      return {
        id: `youtube-${videoId}`,
        video_id: videoId,
        title: snippet.title,
        name: snippet.title,
        artist_name: snippet.channelTitle,
        artist: snippet.channelTitle,
        cover_art_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        image: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        popularity: statsById[videoId] || 0,
        source: 'youtube',
      };
    });

    return res.status(200).json({ success: true, tracks });
  } catch (err) {
    console.error('youtube-music search error:', err);
    return res.status(err.statusCode || 400).json({ success: false, error: err.message, tracks: [] });
  }
}

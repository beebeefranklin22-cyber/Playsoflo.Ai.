import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = Deno.env.get('SOUNDCLOUD_CLIENT_ID');
    if (!clientId) {
      return Response.json({ error: 'SoundCloud API key not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const genre = searchParams.get('genre') || '';
    
    let searchTerm = query || genre;
    if (!searchTerm) searchTerm = 'trending';

    // SoundCloud API v2
    const soundcloudUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(searchTerm)}&client_id=${clientId}&limit=50`;
    const response = await fetch(soundcloudUrl);
    
    if (!response.ok) {
      throw new Error('SoundCloud API error');
    }

    const data = await response.json();
    
    // Transform SoundCloud data to match our format
    const tracks = data.collection.map(track => ({
      id: `soundcloud_${track.id}`,
      name: track.title,
      artist: track.user.username,
      album: 'SoundCloud',
      image: track.artwork_url || track.user.avatar_url,
      preview_url: track.stream_url ? `${track.stream_url}?client_id=${clientId}` : null,
      duration_ms: track.duration,
      source: 'soundcloud',
      external_url: track.permalink_url,
      plays: track.playback_count,
      likes: track.likes_count
    }));

    return Response.json({ tracks });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
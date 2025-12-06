import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, genre, limit = 20 } = await req.json();

    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return Response.json({ error: 'Spotify credentials not configured' }, { status: 500 });
    }

    // Get Spotify access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      return Response.json({ error: 'Failed to authenticate with Spotify' }, { status: 500 });
    }

    const { access_token } = await tokenResponse.json();

    // Build search query
    let searchQuery = query || '';
    if (genre) {
      searchQuery += ` genre:${genre}`;
    }

    // Search for tracks
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=${limit}`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!searchResponse.ok) {
      return Response.json({ error: 'Failed to search Spotify' }, { status: 500 });
    }

    const searchData = await searchResponse.json();

    // Transform Spotify data to our format
    const tracks = searchData.tracks.items.map(track => ({
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url,
      spotify_url: track.external_urls.spotify,
      cover_art: track.album.images[0]?.url,
      spotify_id: track.id,
      popularity: track.popularity
    }));

    return Response.json({
      success: true,
      tracks,
      total: searchData.tracks.total
    });

  } catch (error) {
    console.error('Spotify fetch error:', error);
    return Response.json({ 
      error: error.message || 'Failed to fetch music from Spotify' 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const genre = searchParams.get('genre') || '';
    
    let searchTerm = query || genre;
    if (!searchTerm) searchTerm = 'popular';

    // Deezer API - no authentication required for basic search
    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(searchTerm)}&limit=50`;
    const response = await fetch(deezerUrl);
    
    if (!response.ok) {
      throw new Error('Deezer API error');
    }

    const data = await response.json();
    
    // Transform Deezer data to match our format
    const tracks = data.data.map(track => ({
      id: `deezer_${track.id}`,
      name: track.title,
      artist: track.artist.name,
      album: track.album.title,
      image: track.album.cover_xl || track.album.cover_big,
      preview_url: track.preview,
      duration_ms: track.duration * 1000,
      source: 'deezer',
      external_url: track.link
    }));

    return Response.json({ tracks });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
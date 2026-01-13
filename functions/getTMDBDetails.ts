import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tmdb_id, type = 'movie' } = await req.json();
    const apiKey = Deno.env.get('TMDB_API_KEY');

    if (!apiKey) {
      return Response.json({ error: 'TMDB API key not configured' }, { status: 500 });
    }

    // Get details
    const detailsUrl = `https://api.themoviedb.org/3/${type}/${tmdb_id}?api_key=${apiKey}&append_to_response=videos,credits`;
    const detailsResponse = await fetch(detailsUrl);
    const details = await detailsResponse.json();

    // Get watch providers
    const providersUrl = `https://api.themoviedb.org/3/${type}/${tmdb_id}/watch/providers?api_key=${apiKey}`;
    const providersResponse = await fetch(providersUrl);
    const providers = await providersResponse.json();

    return Response.json({
      title: details.title || details.name,
      description: details.overview,
      thumbnail_url: details.poster_path 
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
        : null,
      backdrop_url: details.backdrop_path 
        ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}`
        : null,
      rating: details.vote_average,
      duration: details.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : null,
      release_date: details.release_date || details.first_air_date,
      genres: details.genres?.map(g => g.name) || [],
      cast: details.credits?.cast?.slice(0, 10).map(c => c.name) || [],
      director: details.credits?.crew?.find(c => c.job === 'Director')?.name,
      trailer: details.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube'),
      watch_providers: providers.results?.US || null,
      tmdb_id: details.id,
      type: type
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type = 'movie', page = 1, query = '' } = await req.json();
    const apiKey = Deno.env.get('TMDB_API_KEY');

    if (!apiKey) {
      return Response.json({ error: 'TMDB API key not configured' }, { status: 500 });
    }

    let url;
    if (query) {
      // Search
      url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}`;
    } else {
      // Popular/Trending
      url = `https://api.themoviedb.org/3/${type}/popular?api_key=${apiKey}&page=${page}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    const formattedResults = data.results.map(item => ({
      tmdb_id: item.id,
      title: item.title || item.name,
      description: item.overview,
      thumbnail_url: item.poster_path 
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Image',
      backdrop_url: item.backdrop_path 
        ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
        : null,
      rating: item.vote_average,
      release_date: item.release_date || item.first_air_date,
      type: type === 'movie' ? 'movie' : 'series',
      category: 'entertainment',
      popularity: item.popularity,
      is_monetized: false,
      requires_subscription: false
    }));

    return Response.json({
      results: formattedResults,
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
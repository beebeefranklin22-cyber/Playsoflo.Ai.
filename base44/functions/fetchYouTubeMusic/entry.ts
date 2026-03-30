import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    const payload = await req.json();
    const query = payload.query || 'music';
    const maxResults = payload.maxResults || 50;
    
    // YouTube Data API v3 - Search for music videos
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' music')}&type=video&videoCategoryId=10&maxResults=${maxResults}&order=relevance&key=${apiKey}`;
    
    const response = await fetch(youtubeUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('YouTube API Error:', errorData);
      return Response.json({ 
        error: errorData.error?.message || 'YouTube API request failed',
        tracks: [],
        fallback: true 
      }, { status: 200 }); // Return empty array instead of error
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return Response.json({ 
        tracks: [],
        message: 'No results found'
      });
    }
    
    // Transform YouTube data to match our format
    const tracks = data.items.map(item => ({
      id: `youtube_${item.id.videoId}`,
      title: item.snippet.title,
      name: item.snippet.title,
      artist_name: item.snippet.channelTitle,
      artist: item.snippet.channelTitle,
      cover_art_url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      image: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      source: 'youtube',
      external_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      video_id: item.id.videoId,
      published_at: item.snippet.publishedAt,
      description: item.snippet.description
    }));

    return Response.json({ tracks });
  } catch (error) {
    console.error('YouTube Music fetch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
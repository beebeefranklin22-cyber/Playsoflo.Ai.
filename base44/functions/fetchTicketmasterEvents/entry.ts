import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keyword, city, stateCode, classificationName, size = 20 } = await req.json();

    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Ticketmaster API key not configured' }, { status: 500 });
    }

    // Build API URL
    const baseUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';
    const params = new URLSearchParams({
      apikey: apiKey,
      size: size.toString()
    });

    if (keyword) params.append('keyword', keyword);
    if (city) params.append('city', city);
    if (stateCode) params.append('stateCode', stateCode);
    if (classificationName) params.append('classificationName', classificationName);

    const response = await fetch(`${baseUrl}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data.errors?.[0]?.detail || 'Failed to fetch events' }, { status: response.status });
    }

    const events = data._embedded?.events || [];
    
    const formattedEvents = events.map(event => ({
      id: event.id,
      name: event.name,
      url: event.url,
      image: event.images?.[0]?.url || '',
      date: event.dates?.start?.localDate,
      time: event.dates?.start?.localTime,
      venue: event._embedded?.venues?.[0]?.name || 'TBA',
      city: event._embedded?.venues?.[0]?.city?.name || '',
      state: event._embedded?.venues?.[0]?.state?.stateCode || '',
      address: event._embedded?.venues?.[0]?.address?.line1 || '',
      priceRange: event.priceRanges?.[0] ? {
        min: event.priceRanges[0].min,
        max: event.priceRanges[0].max,
        currency: event.priceRanges[0].currency
      } : null,
      classification: event.classifications?.[0]?.segment?.name || 'Event',
      genre: event.classifications?.[0]?.genre?.name || '',
      info: event.info || event.pleaseNote || '',
      ticketLimit: event.ticketLimit?.info
    }));

    return Response.json({
      events: formattedEvents,
      total: data.page?.totalElements || 0,
      page: data.page?.number || 0
    });

  } catch (error) {
    console.error('Ticketmaster API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
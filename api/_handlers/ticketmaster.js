import { requireUser } from '../_lib/auth.js';

// EntertainmentExperiences.jsx's "Live Events" tab called
// base44.functions.invoke('fetchTicketmasterEvents', {keyword, city}) with
// no backend behind it, so it always failed. Backed by the real
// Ticketmaster Discovery API (a free, self-serve API -- distinct from
// Ticketmaster's Affiliate Program, which needs a real partnership and is
// a separate, still-unbuilt "Coming Soon" feature in AffiliatePayoutManager.jsx;
// this one only needs an API key). The event card in EntertainmentExperiences.jsx
// reads Ticketmaster's own event object shape directly (event.images[0].url,
// event.dates.start.localDate, event._embedded.venues[0].name,
// event.priceRanges[0].min, event.url), so results are passed through
// unmodified rather than remapped.
const TICKETMASTER_BASE = 'https://app.ticketmaster.com/discovery/v2';

function getTicketmasterKey() {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) {
    const err = new Error('Live event search is not configured yet');
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

  const { keyword, city } = req.body || {};

  try {
    const key = getTicketmasterKey();
    const params = new URLSearchParams({ apikey: key, size: '20' });
    if (keyword) params.set('keyword', keyword);
    if (city) params.set('city', city);

    const response = await fetch(`${TICKETMASTER_BASE}/events.json?${params.toString()}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.fault?.faultstring || data?.errors?.[0]?.detail || `Ticketmaster request failed (${response.status})`;
      return res.status(response.status >= 500 ? 502 : 400).json({ error: message, events: [] });
    }

    return res.status(200).json({ events: data._embedded?.events || [] });
  } catch (err) {
    console.error('ticketmaster events error:', err);
    return res.status(err.statusCode || 400).json({ error: err.message, events: [] });
  }
}

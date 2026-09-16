import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';

const DUFFEL_API_BASE = 'https://api.duffel.com';
const DUFFEL_VERSION = 'v2';

// Flat platform fee on the real Duffel total (flight + any ancillaries),
// captured as a pure debit-only wallet charge -- never sent to Duffel,
// same "purchase" shape as a game shop item (see handlePurchase in
// wallet.js). Applied uniformly so there's one place pricing logic lives,
// rather than splitting it between a client-displayed markup and a
// server-side check.
const PLATFORM_FEE_RATE = 0.012;

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Duffel is the actual flight supplier here -- search results and prices
// are always fetched live from Duffel, never cached/guessed client-side,
// and a booking always re-fetches the offer server-side before charging
// anyone (offer prices expire and change).
function getDuffelKey() {
  const key = process.env.DUFFEL_API_KEY;
  if (!key) {
    const err = new Error('Flight search is not configured yet');
    err.statusCode = 503;
    throw err;
  }
  return key;
}

async function duffelRequest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${DUFFEL_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getDuffelKey()}`,
      'Duffel-Version': DUFFEL_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify({ data: body }) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.errors?.[0]?.message || `Duffel request failed (${res.status})`;
    const err = new Error(message);
    err.statusCode = res.status >= 500 ? 502 : 400;
    throw err;
  }
  return json.data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const { action } = req.body || {};

  try {
    if (action === 'search_places') return res.status(200).json(await handleSearchPlaces(req.body));
    if (action === 'search') return res.status(200).json(await handleSearch(req.body));
    if (action === 'get_offer_details') return res.status(200).json(await handleGetOfferDetails(req.body));
    if (action === 'book') return res.status(200).json(await handleBook(user, req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('flights action error:', action, err);
    return res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
}

// Lets users search flights by city/airport name ("Miami") instead of
// needing to already know the IATA code ("MIA") -- a real Duffel endpoint
// (GET /places/suggestions), not a hand-rolled city list, so it covers the
// same airports Duffel itself can actually route to.
async function handleSearchPlaces(body) {
  const { query } = body;
  if (!query || query.trim().length < 2) return { success: true, places: [] };

  const places = await duffelRequest(`/places/suggestions?name=${encodeURIComponent(query.trim())}`);
  return {
    success: true,
    places: (places || []).slice(0, 8).map((p) => ({
      iata_code: p.iata_code,
      name: p.name,
      type: p.type,
      city_name: p.city_name,
      country_name: p.country_name,
    })),
  };
}

async function handleSearch(body) {
  const { origin, destination, departure_date, return_date, adult_count, cabin_class } = body;
  if (!origin || !destination || !departure_date) {
    throw new Error('origin, destination, and departure_date are required');
  }

  const slices = [{ origin, destination, departure_date }];
  if (return_date) slices.push({ origin: destination, destination: origin, departure_date: return_date });

  const passengerCount = Math.max(1, Math.min(9, Number(adult_count) || 1));
  const passengers = Array.from({ length: passengerCount }, () => ({ type: 'adult' }));

  const offerRequest = await duffelRequest('/air/offer_requests?return_offers=false', {
    method: 'POST',
    body: { slices, passengers, cabin_class: cabin_class || 'economy' },
  });

  const offersPage = await duffelRequest(
    `/air/offers?offer_request_id=${encodeURIComponent(offerRequest.id)}&limit=20&sort=total_amount`
  );

  return {
    success: true,
    offer_request_id: offerRequest.id,
    offers: (offersPage || []).map(simplifyOffer),
  };
}

function simplifyOffer(offer) {
  return {
    id: offer.id,
    total_amount: offer.total_amount,
    total_currency: offer.total_currency,
    expires_at: offer.expires_at,
    passenger_count: (offer.passengers || []).length,
    slices: (offer.slices || []).map((slice) => ({
      origin: slice.origin?.iata_code,
      destination: slice.destination?.iata_code,
      duration: slice.duration,
      segments: (slice.segments || []).map((seg) => ({
        airline: seg.marketing_carrier?.name,
        airline_code: seg.marketing_carrier?.iata_code,
        flight_number: seg.marketing_carrier_flight_number,
        departing_at: seg.departing_at,
        arriving_at: seg.arriving_at,
        origin: seg.origin?.iata_code,
        destination: seg.destination?.iata_code,
        aircraft: seg.aircraft?.name,
      })),
    })),
  };
}

// Seat services live inside seat_maps[].cabins[].rows[].sections[].elements[]
// (each seat element has its own available_services array), a completely
// separate structure from offer.available_services (which only ever covers
// baggage and cancel-for-any-reason) -- flattened here into the same
// {id, total_amount, total_currency} shape so seat/bag/CFAR selections can
// all be validated against one combined lookup.
function flattenSeatServices(seatMaps) {
  const flat = [];
  for (const map of seatMaps || []) {
    for (const cabin of map.cabins || []) {
      for (const row of cabin.rows || []) {
        for (const section of row.sections || []) {
          for (const element of section.elements || []) {
            for (const service of element.available_services || []) {
              flat.push(service);
            }
          }
        }
      }
    }
  }
  return flat;
}

// Fetches the offer with its available ancillary services and seat maps --
// the two inputs the real @duffel/components <DuffelAncillaries> component
// needs (offer + seat_maps props), per its current (non-deprecated) usage.
// No client_key/token minting needed with this approach.
async function handleGetOfferDetails(body) {
  const { offer_id } = body;
  if (!offer_id) throw new Error('offer_id is required');

  const offer = await duffelRequest(`/air/offers/${encodeURIComponent(offer_id)}?return_available_services=true`);
  if (!offer) throw new Error('Flight offer not found');
  if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
    throw new Error('This flight offer has expired -- please search again');
  }

  let seatMaps = [];
  try {
    seatMaps = (await duffelRequest(`/air/seat_maps?offer_id=${encodeURIComponent(offer_id)}`)) || [];
  } catch (err) {
    // Not every airline/fare offers seat maps -- that's a normal, expected
    // gap, not a failure of the search itself.
    console.log('No seat maps available for offer', offer_id, err.message);
  }

  return { success: true, offer, seat_maps: seatMaps };
}

async function handleBook(user, body) {
  const { offer_id, passengers, services, contact_email, contact_phone } = body;
  if (!offer_id) throw new Error('offer_id is required');
  if (!Array.isArray(passengers) || passengers.length === 0) throw new Error('At least one passenger is required');

  // Re-fetch the offer AND its available services -- a client-supplied
  // price or service selection is never trusted, and Duffel offers expire
  // (typically minutes after search).
  const offer = await duffelRequest(`/air/offers/${encodeURIComponent(offer_id)}?return_available_services=true`);
  if (!offer) throw new Error('Flight offer not found');
  if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
    throw new Error('This flight offer has expired -- please search again');
  }
  if (offer.total_currency !== 'USD') {
    throw new Error('Only USD-priced flights can be booked right now');
  }
  if (passengers.length !== (offer.passengers || []).length) {
    throw new Error(`This offer requires exactly ${offer.passengers?.length} passenger(s)`);
  }

  const flightAmount = Number(offer.total_amount);
  if (!flightAmount || flightAmount <= 0) throw new Error('Invalid offer amount');

  // Every requested ancillary service (seat, bag, cancel-for-any-reason)
  // must be one Duffel is actually offering on THIS offer, at THIS price --
  // a service id or quantity is never trusted from the client. Baggage and
  // CFAR live in offer.available_services; seats live nested inside the
  // seat maps response instead (a different Duffel endpoint entirely) --
  // both are combined into one lookup so any requested service must match
  // something Duffel is really offering, or it's rejected outright rather
  // than silently dropped or priced from client input.
  let seatMaps = [];
  if (Array.isArray(services) && services.length > 0) {
    try {
      seatMaps = (await duffelRequest(`/air/seat_maps?offer_id=${encodeURIComponent(offer_id)}`)) || [];
    } catch (err) {
      console.log('No seat maps available for offer', offer_id, err.message);
    }
  }
  const availableServices = [...(offer.available_services || []), ...flattenSeatServices(seatMaps)];
  const requestedServices = Array.isArray(services) ? services : [];
  let servicesAmount = 0;
  const validatedServices = requestedServices.map((requested) => {
    const quantity = Number(requested?.quantity) || 1;
    const match = availableServices.find((s) => s.id === requested?.id);
    if (!match) throw new Error(`Requested service ${requested?.id} is not available on this offer`);
    if (quantity < 1 || quantity > (match.maximum_quantity || 1)) {
      throw new Error(`Invalid quantity for service ${match.id}`);
    }
    if (match.total_currency !== 'USD') throw new Error('Only USD-priced services can be booked right now');
    servicesAmount += Number(match.total_amount) * quantity;
    return { id: match.id, quantity };
  });

  const duffelAmount = round2(flightAmount + servicesAmount);
  const platformFeeAmount = round2(duffelAmount * PLATFORM_FEE_RATE);
  const platformTotal = round2(duffelAmount + platformFeeAmount);

  const admin = getSupabaseAdmin();

  // Debit the user's wallet first, atomically, for the FULL amount they
  // actually owe (flight + ancillaries + platform fee) -- wallet_move
  // rejects on insufficient balance, so nothing downstream (the real
  // Duffel purchase) runs on a charge that didn't actually happen.
  const originCode = offer.slices?.[0]?.origin?.iata_code || '';
  const destinationCode = offer.slices?.[0]?.destination?.iata_code || '';
  const { error: debitError } = await admin.rpc('wallet_move', {
    p_from_email: user.email,
    p_to_email: null,
    p_debit_amount: platformTotal,
    p_credit_amount: null,
    p_reference_type: 'flight_booking',
    p_reference_id: offer_id,
    p_memo: `Flight booking ${originCode} -> ${destinationCode}`,
  });
  if (debitError) {
    const message = String(debitError.message).includes('insufficient balance') ? 'Insufficient balance' : 'Payment failed';
    throw Object.assign(new Error(message), { statusCode: 400 });
  }

  // Duffel's own account balance is what actually pays for the ticket --
  // the wallet debit above is our internal ledger (it includes our own
  // platform fee on top), not money that reaches Duffel directly. Duffel
  // is paid exactly duffelAmount (flight + ancillaries, no markup). This
  // requires the platform's own Duffel account to be pre-funded; if it
  // isn't, this call fails and the refund below fires immediately rather
  // than leaving the user charged with no ticket.
  let order;
  try {
    order = await duffelRequest('/air/orders', {
      method: 'POST',
      body: {
        type: 'instant',
        selected_offers: [offer_id],
        services: validatedServices.length > 0 ? validatedServices : undefined,
        passengers: passengers.map((p, i) => ({
          id: offer.passengers[i].id,
          type: 'adult',
          title: p.title,
          gender: p.gender,
          given_name: p.given_name,
          family_name: p.family_name,
          born_on: p.born_on,
          email: p.email || contact_email || user.email,
          phone_number: p.phone_number || contact_phone,
        })),
        payments: [{ type: 'balance', currency: offer.total_currency, amount: duffelAmount.toFixed(2) }],
      },
    });
  } catch (bookingError) {
    const { error: refundError } = await admin.rpc('wallet_move', {
      p_from_email: null,
      p_to_email: user.email,
      p_debit_amount: null,
      p_credit_amount: platformTotal,
      p_reference_type: 'flight_booking_refund',
      p_reference_id: offer_id,
      p_memo: 'Automatic refund: flight booking failed after payment',
    });
    if (refundError) {
      console.error('CRITICAL: flight booking failed and automatic refund also failed', {
        user: user.email, offer_id, platformTotal, bookingError: bookingError.message, refundError,
      });
      throw Object.assign(
        new Error('Booking failed and the automatic refund also failed -- contact support immediately'),
        { statusCode: 502 }
      );
    }
    throw Object.assign(new Error(`Booking failed and your payment was refunded: ${bookingError.message}`), { statusCode: 502 });
  }

  const { error: insertError } = await admin.from('flight_bookings').insert({
    user_email: user.email,
    duffel_order_id: order.id,
    booking_reference: order.booking_reference,
    status: 'confirmed',
    origin: originCode,
    destination: destinationCode,
    departure_date: offer.slices?.[0]?.segments?.[0]?.departing_at || null,
    return_date: offer.slices?.[1]?.segments?.[0]?.departing_at || null,
    passengers: order.passengers || [],
    slices: offer.slices || [],
    services: order.services || [],
    total_amount: platformTotal,
    duffel_amount: duffelAmount,
    platform_fee_amount: platformFeeAmount,
    currency: offer.total_currency,
  });
  if (insertError) {
    // The order is already confirmed and paid for with Duffel at this
    // point -- log loudly rather than fail a response for a real ticket.
    console.error('Failed to record flight_booking row for order', order.id, insertError);
  }

  return {
    success: true,
    order_id: order.id,
    booking_reference: order.booking_reference,
    duffel_amount: duffelAmount,
    platform_fee_amount: platformFeeAmount,
    total_amount: platformTotal,
  };
}

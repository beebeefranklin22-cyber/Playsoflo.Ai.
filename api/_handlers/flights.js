import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';

const DUFFEL_API_BASE = 'https://api.duffel.com';
const DUFFEL_VERSION = 'v2';

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
    if (action === 'search') return res.status(200).json(await handleSearch(req.body));
    if (action === 'book') return res.status(200).json(await handleBook(user, req.body));
    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (err) {
    console.error('flights action error:', action, err);
    return res.status(err.statusCode || 400).json({ success: false, error: err.message });
  }
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

async function handleBook(user, body) {
  const { offer_id, passengers, contact_email, contact_phone } = body;
  if (!offer_id) throw new Error('offer_id is required');
  if (!Array.isArray(passengers) || passengers.length === 0) throw new Error('At least one passenger is required');

  // Re-fetch the offer -- a client-supplied price is never trusted, and
  // Duffel offers expire (typically minutes after search).
  const offer = await duffelRequest(`/air/offers/${encodeURIComponent(offer_id)}`);
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

  const amount = Number(offer.total_amount);
  if (!amount || amount <= 0) throw new Error('Invalid offer amount');

  const admin = getSupabaseAdmin();

  // Debit the user's wallet first, atomically -- wallet_move rejects on
  // insufficient balance, so nothing downstream (the real Duffel purchase)
  // runs on a charge that didn't actually happen.
  const originCode = offer.slices?.[0]?.origin?.iata_code || '';
  const destinationCode = offer.slices?.[0]?.destination?.iata_code || '';
  const { error: debitError } = await admin.rpc('wallet_move', {
    p_from_email: user.email,
    p_to_email: null,
    p_debit_amount: amount,
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
  // the wallet debit above is our internal ledger, not money that reaches
  // Duffel directly. This requires the platform's own Duffel account to
  // be pre-funded; if it isn't, this call fails and the refund below
  // fires immediately rather than leaving the user charged with no ticket.
  let order;
  try {
    order = await duffelRequest('/air/orders', {
      method: 'POST',
      body: {
        type: 'instant',
        selected_offers: [offer_id],
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
        payments: [{ type: 'balance', currency: offer.total_currency, amount: offer.total_amount }],
      },
    });
  } catch (bookingError) {
    const { error: refundError } = await admin.rpc('wallet_move', {
      p_from_email: null,
      p_to_email: user.email,
      p_debit_amount: null,
      p_credit_amount: amount,
      p_reference_type: 'flight_booking_refund',
      p_reference_id: offer_id,
      p_memo: 'Automatic refund: flight booking failed after payment',
    });
    if (refundError) {
      console.error('CRITICAL: flight booking failed and automatic refund also failed', {
        user: user.email, offer_id, amount, bookingError: bookingError.message, refundError,
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
    total_amount: amount,
    currency: offer.total_currency,
  });
  if (insertError) {
    // The order is already confirmed and paid for with Duffel at this
    // point -- log loudly rather than fail a response for a real ticket.
    console.error('Failed to record flight_booking row for order', order.id, insertError);
  }

  return { success: true, order_id: order.id, booking_reference: order.booking_reference };
}

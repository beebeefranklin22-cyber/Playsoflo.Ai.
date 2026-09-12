import crypto from 'node:crypto';

// Shared between api/checkout.js (single-item purchases) and
// api/cart-checkout.js (multi-item cart checkout) so both create the same
// shape of order row and apply the same platform fee math.
export const PLATFORM_FEE_RATES = {
  service_booking: 0.15,
  product_order: 0.15,
  digital_product: 0.20,
  subscription: 0.20,
  experience: 0.19,
  food_order: 0.10,
  property_booking: 0.12,
  car_rental: 0.15,
  // Same rate as `experience` — TicketPurchaseModal.jsx sells tickets/passes
  // for the same `experiences` listings that `experience` was reserved for.
  entertainment_ticket: 0.19,
};

export const TABLE_BY_ORDER_TYPE = {
  service_booking: 'service_bookings',
  experience: 'service_bookings',
  product_order: 'orders',
  food_order: 'food_orders',
  digital_product: 'content_purchases',
  subscription: 'subscriptions',
  entertainment_ticket: 'entertainment_tickets',
};

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function cleanError(message) {
  if (!message) return 'Checkout failed';
  if (message.includes('insufficient balance')) return 'Insufficient wallet balance';
  return message;
}

// Mirrors api/rides.js's notify() shape. Best-effort — a failed notification
// insert is logged, never allowed to fail the order that already charged
// real money.
async function notify(admin, recipientEmail, type, title, message, referenceType, referenceId) {
  if (!recipientEmail) return;
  const { error } = await admin.from('notifications').insert({
    recipient_email: recipientEmail, type, title, message, reference_type: referenceType, reference_id: referenceId, read: false,
  });
  if (error) console.error('Failed to create notification:', error);
}

function generateTicketNumber() {
  return `TKT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function generateAccessCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Same formula TicketRedemptionScanner.jsx recomputes client-side to verify
// a scanned ticket — keep these in lockstep or every ticket will fail
// verification.
function generateSecurityHash(ticketNumber, accessCode, timestamp, experienceId, buyerEmail) {
  const data = `${ticketNumber}:${accessCode}:${timestamp}:${experienceId}:${buyerEmail}`;
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16).toUpperCase();
}

function generateQrCode(ticketNumber, accessCode) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="100" y="90" font-size="10" text-anchor="middle" font-family="monospace">${ticketNumber}</text><text x="100" y="110" font-size="8" text-anchor="middle" fill="#666">${accessCode}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export async function createOrderRow(admin, orderType, ctx) {
  const table = TABLE_BY_ORDER_TYPE[orderType];
  let row;

  if (table === 'content_purchases') {
    row = {
      content_id: ctx.item_id,
      // Also stamp item_id/item_type (content_purchases carries both
      // column sets) since PurchaseAccessGate/ArtistProfile's "already
      // purchased?" check queries by item_type + item_id, not content_id.
      item_id: ctx.item_id,
      item_type: ctx.item_type || orderType,
      buyer_email: ctx.customerEmail,
      creator_email: ctx.provider_email,
      seller_email: ctx.provider_email,
      amount_usd: ctx.totalAmount,
      price_paid: ctx.totalAmount,
      purchase_type: orderType === 'subscription' ? 'subscribe' : 'buy',
      payment_method: ctx.paymentMethod,
      payment_intent_id: ctx.paymentIntentId,
      platform_fee: ctx.platformFee,
      creator_earnings: ctx.providerEarnings,
    };
  } else if (table === 'subscriptions') {
    row = {
      customer_email: ctx.customerEmail,
      provider_email: ctx.provider_email,
      item_id: ctx.item_id,
      item_title: ctx.item_title,
      interval: ctx.subscription_interval || 'monthly',
      amount: ctx.totalAmount,
      platform_fee: ctx.platformFee,
      provider_earnings: ctx.providerEarnings,
      status: 'active',
      payment_method: ctx.paymentMethod,
      payment_intent_id: ctx.paymentIntentId,
    };
  } else if (table === 'service_bookings') {
    row = {
      customer_email: ctx.customerEmail,
      provider_email: ctx.provider_email,
      service_id: ctx.item_id,
      service_title: ctx.item_title,
      booking_type: ctx.order_type,
      booking_date: ctx.booking_date || null,
      booking_time: ctx.booking_time || null,
      total_price: ctx.totalAmount,
      platform_fee: ctx.platformFee,
      provider_earnings: ctx.providerEarnings,
      status: 'confirmed',
      payment_method: ctx.paymentMethod,
      payment_intent_id: ctx.paymentIntentId,
      special_requirements: ctx.customer_notes || null,
      quantity: ctx.quantity || 1,
    };
  } else if (table === 'entertainment_tickets') {
    // Replaces TicketPurchaseModal.jsx's old flow, which charged the buyer
    // (Stripe or wallet) and only THEN tried to insert a ticket row with
    // ~11 columns (experience_id included) that never existed on this
    // table — the charge always succeeded and the insert always threw, so
    // every buyer was charged with no ticket and no refund. Money now
    // moves first (same as every other order type here), and this branch
    // only ever runs after that succeeds.
    const experienceId = ctx.item_id;
    const quantity = ctx.quantity || 1;

    // Capacity check. This still runs after the charge (same post-charge
    // insert-failure limitation every other order type in this file
    // already accepts — see the file-level comment in api/checkout.js) but
    // it's the best a single-request flow can do without a separate
    // hold/reserve step, and capacity conflicts should be rare since the
    // browse UI already shows availability.
    const { data: expRow, error: expError } = await admin
      .from('experiences')
      .select('total_capacity')
      .eq('id', experienceId)
      .maybeSingle();
    if (expError) throw expError;
    const capacity = expRow?.total_capacity;
    if (capacity && capacity > 0) {
      const { data: soldRows, error: soldError } = await admin
        .from('entertainment_tickets')
        .select('quantity')
        .eq('experience_id', experienceId)
        .eq('status', 'confirmed');
      if (soldError) throw soldError;
      const sold = (soldRows || []).reduce((sum, r) => sum + (r.quantity || 1), 0);
      if (sold + quantity > capacity) {
        const remaining = Math.max(capacity - sold, 0);
        throw new Error(remaining > 0
          ? `Only ${remaining} spot(s) left for this experience`
          : 'This experience is sold out');
      }
    }

    const isPass = !!ctx.is_pass;
    const timestamp = new Date().toISOString();
    const ticketNumber = generateTicketNumber();
    const accessCode = generateAccessCode();
    const securityHash = generateSecurityHash(ticketNumber, accessCode, timestamp, experienceId, ctx.customerEmail);
    const qrCode = generateQrCode(ticketNumber, accessCode);

    let passValidFrom = null;
    let passValidUntil = null;
    if (isPass) {
      const validFrom = new Date();
      const validUntil = new Date(validFrom);
      validUntil.setDate(validUntil.getDate() + (Number(ctx.pass_validity_days) || 1));
      passValidFrom = validFrom.toISOString();
      passValidUntil = validUntil.toISOString();
    }

    row = {
      experience_id: experienceId,
      experience_title: ctx.item_title,
      buyer_email: ctx.customerEmail,
      buyer_name: ctx.buyer_name || null,
      provider_email: ctx.provider_email,
      ticket_number: ticketNumber,
      batch_id: ticketNumber,
      qr_code: qrCode,
      security_hash: securityHash,
      access_code: accessCode,
      verification_timestamp: timestamp,
      quantity,
      venue_name: ctx.venue_name || null,
      venue_address: ctx.venue_address || null,
      status: 'confirmed',
      payment_intent_id: ctx.paymentIntentId,
      price_paid: ctx.totalAmount,
      ticket_type: isPass ? (ctx.pass_type || null) : (ctx.ticket_type || null),
      event_date: isPass ? null : (ctx.event_date || null),
      event_time: isPass ? null : (ctx.event_time || null),
      is_pass: isPass,
      pass_type: isPass ? (ctx.pass_type || null) : null,
      pass_valid_from: passValidFrom,
      pass_valid_until: passValidUntil,
      pass_visits_allowed: isPass ? (Number(ctx.pass_visit_limit) || 1) : null,
      pass_visits_used: isPass ? 0 : null,
      pass_perks: isPass ? (ctx.pass_perks || []) : null,
    };
  } else {
    // orders (product_order) and food_orders share the same shape
    row = {
      customer_email: ctx.customerEmail,
      provider_email: ctx.provider_email,
      item_id: ctx.item_id,
      item_title: ctx.item_title,
      quantity: ctx.quantity || 1,
      subtotal: ctx.itemSubtotal,
      platform_fee: ctx.platformFee,
      provider_earnings: ctx.providerEarnings,
      total_amount: ctx.totalAmount,
      status: 'confirmed',
      payment_method: ctx.paymentMethod,
      payment_intent_id: ctx.paymentIntentId,
      fulfillment_method: ctx.fulfillment_method || null,
      delivery_address: ctx.delivery_address || null,
      shipping_address: ctx.shipping_address || null,
      customer_notes: ctx.customer_notes || null,
      customer_phone: ctx.customer_phone || null,
    };
  }

  const { data, error } = await admin.from(table).insert(row).select().single();
  if (error) throw error;

  if (table === 'entertainment_tickets') {
    const qty = row.quantity || 1;
    await notify(
      admin, ctx.provider_email, 'sale', 'New ticket sale',
      `${ctx.customerEmail} purchased ${qty} ${row.is_pass ? 'pass' : 'ticket'}(s) for "${ctx.item_title}"`,
      'entertainment_ticket', data.id
    );
    await notify(
      admin, ctx.customerEmail, 'purchase', 'Ticket purchase confirmed',
      `Your ${qty} ${row.is_pass ? 'pass' : 'ticket'}(s) for "${ctx.item_title}" are confirmed.`,
      'entertainment_ticket', data.id
    );
  }

  return { id: data.id, row: data };
}

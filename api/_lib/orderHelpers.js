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

// Used by api/_handlers/wallet.js's credit_from_payment action (crediting a
// recipient's wallet after a Stripe charge that isn't a checkout-flow order
// row -- tips, PPV, livestream purchases). Keyed by the same reference_type
// the client already sends, so the RATE itself is resolved server-side
// instead of trusted from the request body: a client used to be able to
// send fee_rate: 0 and take the platform's cut on any of these to zero.
export const CREDIT_FEE_RATES = {
  wallet_deposit: 0,     // adding your own money to your own wallet — no fee
  livestream_tip: 0.10,
  livestream_product: 0.20,
  travel_booking: 0.15,
  service_booking: 0.15,
  luxury_booking: 0.15,
  ppv: 0.20,             // same rate as digital_product — on-demand paid content
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
  // Covers both an unset STRIPE_SECRET_KEY and a set-but-wrong one (e.g. a
  // key ID pasted instead of the actual secret, which Stripe's API rejects
  // with "Invalid API key provided") -- confirmed live in production via a
  // real test purchase, both are a misconfigured account, not something a
  // customer can do anything about.
  if (message.includes('STRIPE_SECRET_KEY') || message.includes('Invalid API key provided')) {
    return 'Card payments are temporarily unavailable — please try Wallet instead.';
  }
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

// AffiliateProgram.jsx advertises "5% commission instantly credited to your
// wallet" on a referred purchase — this is the actual crediting, called
// from checkout.js/cart-checkout.js after an order's platform fee is known.
// Commission is 5% of the PLATFORM'S FEE (not the gross order value), same
// shape as any other rev-share in this app: it comes out of what the
// platform would have kept, never out of the provider's earnings. Best
// effort and never throws — a referral commission failing must never undo
// or fail an order that already collected real money.
export async function creditAffiliateCommission(admin, { buyerEmail, platformFee, orderType, orderValue, referenceId }) {
  try {
    if (!platformFee || platformFee <= 0) return;

    const { data: buyer } = await admin
      .from('profiles')
      .select('referred_by_code')
      .eq('email', buyerEmail)
      .maybeSingle();
    if (!buyer?.referred_by_code) return;

    const { data: affiliate } = await admin
      .from('profiles')
      .select('email')
      .eq('referral_code', buyer.referred_by_code)
      .maybeSingle();
    if (!affiliate?.email || affiliate.email === buyerEmail) return;

    const commission = round2(platformFee * 0.05);
    if (commission <= 0) return;

    const { error: moveError } = await admin.rpc('wallet_move', {
      p_from_email: null,
      p_to_email: affiliate.email,
      p_debit_amount: null,
      p_credit_amount: commission,
      p_reference_type: 'affiliate_commission',
      p_reference_id: referenceId || null,
      p_memo: `Referral commission: ${orderType}`,
    });
    if (moveError) throw moveError;

    await admin.from('affiliate_referrals').insert({
      referral_code: buyer.referred_by_code,
      referred_user_email: buyerEmail,
      commission_amount: commission,
      commission_rate: 5,
      status: 'completed',
      product_name: orderType,
      order_value: orderValue || null,
      conversion_date: new Date().toISOString(),
    });

    await admin.rpc('increment_referral_earnings', { p_email: affiliate.email, p_amount: commission }).catch(async () => {
      // Fallback if the increment function isn't present for any reason —
      // a plain read-then-write is fine here since it's just a display
      // total, not a balance that needs atomic correctness.
      const { data: profile } = await admin.from('profiles').select('total_referral_earnings').eq('email', affiliate.email).maybeSingle();
      await admin.from('profiles').update({ total_referral_earnings: (profile?.total_referral_earnings || 0) + commission }).eq('email', affiliate.email);
    });
  } catch (err) {
    console.error('creditAffiliateCommission failed:', err);
  }
}

// CRITICAL: re-verifies a Stripe PaymentIntent before any handler treats it
// as proof of payment for an order. Every "confirm_payment_intent_id"
// branch in this codebase used to check only `intent.status === 'succeeded'`
// -- nothing compared the intent's actually-charged amount against the
// order total being confirmed, nothing checked the intent was created for
// the confirming user, and nothing stopped the same intent from being
// confirmed more than once. That combination let a client recycle one real,
// small charge into crediting an arbitrarily large amount: create (and pay)
// a $1 PaymentIntent, then call confirm again with an inflated order total
// computed from a tampered request body -- the $1 charge would be recycled
// into whatever credit the new total implied, repeatably.
//
// expectedAmountCents must be computed from the SAME values that will be
// written to the order row / used in the wallet credit, so a mismatch here
// means the confirm-time request describes a different order than what was
// actually paid for. Throws (never returns a soft failure) so every caller
// fails the same way checkTicketCapacity already does.
export async function consumeVerifiedPaymentIntent(admin, intent, { expectedAmountCents, buyerEmail, referenceType }) {
  if (intent.status !== 'succeeded') {
    throw new Error(`Payment not completed (status: ${intent.status})`);
  }
  if (intent.amount !== Math.round(expectedAmountCents)) {
    throw new Error('Payment amount does not match the order total');
  }
  if (intent.metadata?.customer_email !== buyerEmail) {
    throw new Error('This payment was not made by you');
  }
  const { error } = await admin
    .from('consumed_payment_intents')
    .insert({ payment_intent_id: intent.id, reference_type: referenceType || null });
  if (error) {
    if (error.code === '23505') throw new Error('This payment has already been used for an order');
    throw error;
  }
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

// Called by api/checkout.js BEFORE any money moves (wallet debit or Stripe
// charge) so a sold-out experience is rejected before the buyer is charged,
// not after -- it's also re-run inside createOrderRow as a last check right
// before the insert, since two buyers can still race between this precheck
// and their own money already having moved; that residual race (charged,
// then rejected) is now the rare case instead of the every-time case.
export async function checkTicketCapacity(admin, experienceId, quantity) {
  const { data: expRow, error: expError } = await admin
    .from('experiences')
    .select('total_capacity')
    .eq('id', experienceId)
    .maybeSingle();
  if (expError) throw expError;
  const capacity = expRow?.total_capacity;
  if (!capacity || capacity <= 0) return;

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
  } else if (orderType === 'food_order') {
    // food_orders predates this generic checkout path — FoodCart.jsx used to
    // insert directly into it with a richer, restaurant-specific shape, and
    // the rest of the food ordering UI (FoodOrderTracking, RestaurantOwnerHub,
    // FoodDriverHub, ProviderEarningsSummary, SidebarQuickStats) still reads
    // that shape (restaurant_name/address/phone, delivery_fee, items,
    // commission_amount, total, driver_earnings, created_by, owner_email,
    // etc). Populate both the standard checkout columns and those legacy
    // display columns from the same values so nothing downstream needs
    // rewriting. Starts at 'pending' (not 'confirmed' like other order
    // types) because RestaurantOwnerHub's own "Confirm Order" step and
    // FoodDriverHub's "available orders" query both expect that first state.
    const deliveryFee = ctx.delivery_fee || 0;
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
      status: 'pending',
      payment_method: ctx.paymentMethod,
      payment_intent_id: ctx.paymentIntentId,
      delivery_address: ctx.delivery_address || null,
      customer_notes: ctx.customer_notes || null,
      customer_phone: ctx.customer_phone || null,
      delivery_coords: ctx.delivery_coords || null,
      // Legacy/display columns the food ordering UI already reads.
      created_by: ctx.customerEmail,
      user_email: ctx.customerEmail,
      owner_email: ctx.provider_email,
      restaurant_owner_email: ctx.provider_email,
      restaurant_id: ctx.item_id,
      restaurant_name: ctx.item_title,
      restaurant_address: ctx.restaurant_address || null,
      restaurant_phone: ctx.restaurant_phone || null,
      estimated_delivery_time: ctx.estimated_delivery_time || null,
      delivery_fee: deliveryFee,
      special_instructions: ctx.customer_notes || null,
      commission_amount: ctx.platformFee,
      total: ctx.totalAmount,
      driver_earnings: deliveryFee ? round2(deliveryFee * 0.8) : null,
      items: ctx.items || [],
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

    // Final check right before the insert -- api/checkout.js already ran
    // this same check before money moved, so this only ever fires on a
    // genuine race between two concurrent buyers.
    await checkTicketCapacity(admin, experienceId, quantity);

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
    // orders (product_order) share this generic shape
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

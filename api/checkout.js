import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireUser } from './_lib/auth.js';
import { createPaymentIntent, retrievePaymentIntent } from './_lib/stripe.js';

// Backs processUnifiedCheckout, the core booking/purchase flow used by
// UnifiedBookingModal for every order_type. Mirrors the fee math already
// computed client-side (see UnifiedBookingModal.jsx's platformFeeRate
// table) so the charged/credited amounts match what the customer was
// shown, while keeping the actual money movement server-side and
// authenticated.
//
// Known limitation: delivery fee isn't added here yet (calculateDeliveryPrice
// needs a maps/geocoding key that isn't configured) — only item subtotal +
// platform fee is charged for now. Also, `amount` (item subtotal) is trusted
// from the client rather than re-priced from a catalog table server-side,
// consistent with how the rest of this app's payment integrations already
// work; tightening that is a follow-up, not a regression.
const PLATFORM_FEE_RATES = {
  service_booking: 0.15,
  product_order: 0.15,
  digital_product: 0.20,
  subscription: 0.20,
  experience: 0.19,
  food_order: 0.10,
};

const TABLE_BY_ORDER_TYPE = {
  service_booking: 'service_bookings',
  experience: 'service_bookings',
  product_order: 'orders',
  food_order: 'food_orders',
  digital_product: 'content_purchases',
  subscription: 'subscriptions',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const body = req.body || {};
  const orderType = body.order_type;
  const feeRate = PLATFORM_FEE_RATES[orderType];
  if (feeRate === undefined) return res.status(400).json({ error: `Unknown order_type "${orderType}"` });

  const itemSubtotal = Number(body.amount);
  if (!itemSubtotal || itemSubtotal <= 0) return res.status(400).json({ error: 'amount must be a positive number' });

  const platformFee = round2(itemSubtotal * feeRate);
  const providerEarnings = round2(itemSubtotal - platformFee);
  const totalAmount = round2(itemSubtotal + platformFee);

  const admin = getSupabaseAdmin();

  try {
    if (body.payment_method === 'wallet') {
      if (!body.provider_email) return res.status(400).json({ error: 'provider_email is required' });

      const { error: moveError } = await admin.rpc('wallet_move', {
        p_from_email: user.email,
        p_to_email: body.provider_email,
        p_debit_amount: totalAmount,
        p_credit_amount: providerEarnings,
        p_reference_type: orderType,
        p_reference_id: null,
        p_memo: body.item_title || null,
      });
      if (moveError) throw moveError;

      const orderId = await createOrderRow(admin, orderType, {
        ...body,
        customerEmail: user.email,
        itemSubtotal, platformFee, providerEarnings, totalAmount,
        paymentMethod: 'wallet',
        paymentIntentId: null,
      });
      return res.status(200).json({ success: true, order_id: orderId });
    }

    if (body.payment_method === 'stripe') {
      if (body.confirm_payment_intent_id) {
        const intent = await retrievePaymentIntent(body.confirm_payment_intent_id);
        if (intent.status !== 'succeeded') {
          return res.status(400).json({ error: `Payment not completed (status: ${intent.status})` });
        }

        if (body.provider_email) {
          const { error: creditError } = await admin.rpc('wallet_move', {
            p_from_email: null,
            p_to_email: body.provider_email,
            p_debit_amount: null,
            p_credit_amount: providerEarnings,
            p_reference_type: orderType,
            p_reference_id: intent.id,
            p_memo: body.item_title || null,
          });
          if (creditError) console.error('Failed to credit provider earnings for', intent.id, creditError);
        }

        const orderId = await createOrderRow(admin, orderType, {
          ...body,
          customerEmail: user.email,
          itemSubtotal, platformFee, providerEarnings, totalAmount,
          paymentMethod: 'stripe',
          paymentIntentId: intent.id,
        });
        return res.status(200).json({ success: true, order_id: orderId });
      }

      const intent = await createPaymentIntent({
        amountCents: Math.round(totalAmount * 100),
        currency: 'usd',
        metadata: { order_type: orderType, customer_email: user.email, provider_email: body.provider_email || '' },
      });
      return res.status(200).json({
        client_secret: intent.client_secret,
        publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
        payment_intent_id: intent.id,
      });
    }

    return res.status(400).json({ error: `Unknown payment_method "${body.payment_method}"` });
  } catch (err) {
    console.error('checkout error:', err);
    return res.status(400).json({ error: cleanError(err.message) });
  }
}

async function createOrderRow(admin, orderType, ctx) {
  const table = TABLE_BY_ORDER_TYPE[orderType];
  let row;

  if (table === 'content_purchases') {
    row = {
      content_id: ctx.item_id,
      buyer_email: ctx.customerEmail,
      creator_email: ctx.provider_email,
      amount_usd: ctx.totalAmount,
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

  const { data, error } = await admin.from(table).insert(row).select('id').single();
  if (error) throw error;
  return data.id;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function cleanError(message) {
  if (!message) return 'Checkout failed';
  if (message.includes('insufficient balance')) return 'Insufficient wallet balance';
  return message;
}

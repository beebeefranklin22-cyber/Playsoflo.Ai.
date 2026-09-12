import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireUser } from './_lib/auth.js';
import { createPaymentIntent, retrievePaymentIntent } from './_lib/stripe.js';
import { PLATFORM_FEE_RATES, createOrderRow, round2, cleanError } from './_lib/orderHelpers.js';

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
//
// For multi-item cart checkout (several products, possibly from different
// providers, in one purchase), see api/cart-checkout.js instead — this file
// stays scoped to a single item per call.

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

      const order = await createOrderRow(admin, orderType, {
        ...body,
        customerEmail: user.email,
        itemSubtotal, platformFee, providerEarnings, totalAmount,
        paymentMethod: 'wallet',
        paymentIntentId: null,
      });
      return res.status(200).json({
        success: true, order_id: order.id,
        ...(orderType === 'entertainment_ticket' ? { ticket: order.row } : {}),
      });
    }

    if (body.payment_method === 'stripe') {
      const finalizeStripeOrder = async (intent) => {
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

        const order = await createOrderRow(admin, orderType, {
          ...body,
          customerEmail: user.email,
          itemSubtotal, platformFee, providerEarnings, totalAmount,
          paymentMethod: 'stripe',
          paymentIntentId: intent.id,
        });
        return res.status(200).json({
          success: true, order_id: order.id,
          ...(orderType === 'entertainment_ticket' ? { ticket: order.row } : {}),
        });
      };

      if (body.confirm_payment_intent_id) {
        const intent = await retrievePaymentIntent(body.confirm_payment_intent_id);
        if (intent.status !== 'succeeded') {
          return res.status(400).json({ error: `Payment not completed (status: ${intent.status})` });
        }
        return finalizeStripeOrder(intent);
      }

      if (body.saved_payment_method_id) {
        const { data: pmRow, error: pmError } = await admin
          .from('payment_methods')
          .select('stripe_customer_id, stripe_payment_method_id')
          .eq('id', body.saved_payment_method_id)
          .eq('user_email', user.email)
          .eq('status', 'active')
          .single();
        if (pmError || !pmRow?.stripe_payment_method_id || !pmRow?.stripe_customer_id) {
          return res.status(400).json({ error: 'Saved payment method not found' });
        }

        const intent = await createPaymentIntent({
          amountCents: Math.round(totalAmount * 100),
          currency: 'usd',
          metadata: { order_type: orderType, customer_email: user.email, provider_email: body.provider_email || '' },
          customerId: pmRow.stripe_customer_id,
          paymentMethodId: pmRow.stripe_payment_method_id,
          offSession: true,
        });

        if (intent.status !== 'succeeded') {
          return res.status(400).json({ error: `This card needs additional verification (status: ${intent.status}). Please use a new card instead.` });
        }
        return finalizeStripeOrder(intent);
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


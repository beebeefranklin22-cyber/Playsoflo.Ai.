import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser } from '../_lib/auth.js';
import { createPaymentIntent, retrievePaymentIntent } from '../_lib/stripe.js';
import { PLATFORM_FEE_RATES, createOrderRow, round2, cleanError, creditAffiliateCommission, consumeVerifiedPaymentIntent } from '../_lib/orderHelpers.js';

// Checks out everything currently in the caller's `carts` table (added via
// AddToCartButton / src/pages/Cart.jsx) in one purchase, possibly spanning
// several different providers. Every cart row is currently a marketplace
// product, so this always prices as order_type 'product_order' — if
// non-marketplace item_types are ever added to the cart flow, this will
// need per-item fee rates instead of one flat rate for the whole cart.
//
// CRITICAL: cart line prices/provider_email used to be read from the
// `carts` table itself on the theory that it wasn't client-controlled --
// but `carts.price` and `carts.provider_email` are plain columns the
// browser writes directly at add-to-cart time (AddToCartButton.jsx), with
// no protecting trigger and no lockdown in carts' own RLS. A tampered
// insert could set an arbitrary near-zero price and/or point
// provider_email at an account the attacker controls. Every line is now
// re-priced from the real marketplace_items listing by item_id; the carts
// row is only a pointer to what's in the cart, never a price source.
//
// Known limitation: for a Stripe purchase, the PaymentIntent is created for
// whatever the cart totals at that moment; if the cart changes between
// creating the intent and confirming it, the confirm step re-reads the
// cart as it now stands and could credit providers for a different total
// than was actually charged. This mirrors the same trust/timing tradeoff
// already accepted in api/checkout.js rather than adding cart-snapshotting
// this pass.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return res.status(err.statusCode || 401).json({ error: err.message });
  }

  const body = req.body || {};
  const admin = getSupabaseAdmin();

  try {
    const { data: cartRows, error: cartError } = await admin
      .from('carts')
      .select('*')
      .eq('user_email', user.email);
    if (cartError) throw cartError;
    if (!cartRows || cartRows.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty' });
    }

    const feeRate = PLATFORM_FEE_RATES.product_order;
    const { data: listings, error: listingsError } = await admin
      .from('marketplace_items')
      .select('id, price, provider_email, seller_email, created_by')
      .in('id', cartRows.map((r) => r.item_id));
    if (listingsError) throw listingsError;
    const listingById = new Map((listings || []).map((l) => [l.id, l]));

    const lineItems = cartRows.map((row) => {
      const listing = listingById.get(row.item_id);
      if (!listing) {
        throw new Error(`Cart item "${row.item_name || row.item_id}" is no longer available`);
      }
      const providerEmail = listing.provider_email || listing.seller_email || listing.created_by;
      if (!providerEmail) {
        throw new Error(`Cart item "${row.item_name || row.item_id}" is missing a provider and can't be checked out`);
      }
      const quantity = row.quantity || 1;
      const itemSubtotal = round2((listing.price || 0) * quantity);
      if (itemSubtotal <= 0) {
        throw new Error(`Cart item "${row.item_name || row.item_id}" has an invalid price`);
      }
      const platformFee = round2(itemSubtotal * feeRate);
      const providerEarnings = round2(itemSubtotal - platformFee);
      const totalAmount = round2(itemSubtotal + platformFee);
      return { row, providerEmail, quantity, itemSubtotal, platformFee, providerEarnings, totalAmount };
    });

    const grandTotal = round2(lineItems.reduce((sum, li) => sum + li.totalAmount, 0));

    if (body.payment_method === 'wallet') {
      const lines = lineItems.map((li) => ({
        to_email: li.providerEmail,
        debit_amount: li.totalAmount,
        credit_amount: li.providerEarnings,
        reference_type: 'product_order',
        reference_id: li.row.item_id,
        memo: li.row.item_name || null,
      }));

      const { error: moveError } = await admin.rpc('wallet_checkout_multi', {
        p_from_email: user.email,
        p_lines: lines,
      });
      if (moveError) throw moveError;

      const orderIds = await createOrderRows(admin, lineItems, user.email, 'wallet', null);
      await clearCartRows(admin, cartRows);
      const totalPlatformFee = round2(lineItems.reduce((sum, li) => sum + li.platformFee, 0));
      await creditAffiliateCommission(admin, { buyerEmail: user.email, platformFee: totalPlatformFee, orderType: 'product_order', orderValue: grandTotal, referenceId: orderIds[0] });
      return res.status(200).json({ success: true, order_ids: orderIds, total_charged: grandTotal });
    }

    if (body.payment_method === 'stripe') {
      const finalizeStripeCartOrder = async (intent) => {
        await consumeVerifiedPaymentIntent(admin, intent, {
          expectedAmountCents: Math.round(grandTotal * 100),
          buyerEmail: user.email,
          referenceType: 'cart_checkout',
        });

        for (const li of lineItems) {
          const { error: creditError } = await admin.rpc('wallet_move', {
            p_from_email: null,
            p_to_email: li.providerEmail,
            p_debit_amount: null,
            p_credit_amount: li.providerEarnings,
            p_reference_type: 'product_order',
            p_reference_id: intent.id,
            p_memo: li.row.item_name || null,
          });
          if (creditError) console.error('Failed to credit provider earnings for', intent.id, li.providerEmail, creditError);
        }

        const orderIds = await createOrderRows(admin, lineItems, user.email, 'stripe', intent.id);
        await clearCartRows(admin, cartRows);
        const totalPlatformFee = round2(lineItems.reduce((sum, li) => sum + li.platformFee, 0));
        await creditAffiliateCommission(admin, { buyerEmail: user.email, platformFee: totalPlatformFee, orderType: 'product_order', orderValue: grandTotal, referenceId: orderIds[0] });
        return res.status(200).json({ success: true, order_ids: orderIds, total_charged: grandTotal });
      };

      if (body.confirm_payment_intent_id) {
        const intent = await retrievePaymentIntent(body.confirm_payment_intent_id);
        return finalizeStripeCartOrder(intent);
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
          amountCents: Math.round(grandTotal * 100),
          currency: 'usd',
          metadata: { order_type: 'cart', customer_email: user.email, item_count: String(cartRows.length) },
          customerId: pmRow.stripe_customer_id,
          paymentMethodId: pmRow.stripe_payment_method_id,
          offSession: true,
        });

        if (intent.status !== 'succeeded') {
          return res.status(400).json({ error: `This card needs additional verification (status: ${intent.status}). Please use a new card instead.` });
        }
        return finalizeStripeCartOrder(intent);
      }

      const intent = await createPaymentIntent({
        amountCents: Math.round(grandTotal * 100),
        currency: 'usd',
        metadata: { order_type: 'cart', customer_email: user.email, item_count: String(cartRows.length) },
      });
      return res.status(200).json({
        client_secret: intent.client_secret,
        publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
        payment_intent_id: intent.id,
        total: grandTotal,
      });
    }

    return res.status(400).json({ error: `Unknown payment_method "${body.payment_method}"` });
  } catch (err) {
    console.error('cart checkout error:', err);
    return res.status(400).json({ error: cleanError(err.message) });
  }
}

async function createOrderRows(admin, lineItems, customerEmail, paymentMethod, paymentIntentId) {
  const orderIds = [];
  for (const li of lineItems) {
    const order = await createOrderRow(admin, 'product_order', {
      customerEmail,
      provider_email: li.providerEmail,
      item_id: li.row.item_id,
      item_title: li.row.item_name,
      quantity: li.quantity,
      itemSubtotal: li.itemSubtotal,
      platformFee: li.platformFee,
      providerEarnings: li.providerEarnings,
      totalAmount: li.totalAmount,
      paymentMethod,
      paymentIntentId,
      customer_notes: li.row.notes || null,
    });
    orderIds.push(order.id);
  }
  return orderIds;
}

async function clearCartRows(admin, cartRows) {
  const ids = cartRows.map((r) => r.id);
  const { error } = await admin.from('carts').delete().in('id', ids);
  if (error) console.error('Failed to clear cart after checkout:', error);
}

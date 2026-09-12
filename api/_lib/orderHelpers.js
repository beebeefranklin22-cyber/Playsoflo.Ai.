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
};

export const TABLE_BY_ORDER_TYPE = {
  service_booking: 'service_bookings',
  experience: 'service_bookings',
  product_order: 'orders',
  food_order: 'food_orders',
  digital_product: 'content_purchases',
  subscription: 'subscriptions',
};

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function cleanError(message) {
  if (!message) return 'Checkout failed';
  if (message.includes('insufficient balance')) return 'Insufficient wallet balance';
  return message;
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

  const { data, error } = await admin.from(table).insert(row).select('id').single();
  if (error) throw error;
  return data.id;
}

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Plus, Minus, Trash2, MapPin, Store, Clock, Phone,
  CreditCard, Wallet, Loader2, AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import StripeCheckoutForm from "../components/payment/StripeCheckoutForm";
import { dispatchFoodOrder } from "@/functions/dispatchFoodOrder";

// Food ordering used to insert directly into food_orders from the client
// (base44.entities.FoodOrder.create(...)). That table is a money table
// locked down in 0004_lock_down_money_tables.sql — authenticated INSERT was
// revoked — so every checkout attempt threw a permission-denied error the
// customer never saw (it was swallowed) and never reached payment. This now
// goes through the same secure api/checkout.js flow UnifiedBookingModal uses
// for every other hub: money moves first (wallet_move or a Stripe
// PaymentIntent), and only then does the server (service role) create the
// food_orders row.
export default function FoodCart() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [processing, setProcessing] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [customerCoords, setCustomerCoords] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart-items'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.CartItem.list();
    }
  });

  const { data: restaurant } = useQuery({
    queryKey: ['cart-restaurant'],
    queryFn: async () => {
      if (cartItems.length === 0) return null;
      const restaurants = await base44.entities.Restaurant.list();
      return restaurants.find(r => r.id === cartItems[0].restaurant_id);
    },
    enabled: cartItems.length > 0
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, newQuantity }) => {
      if (newQuantity <= 0) {
        return base44.entities.CartItem.delete(itemId);
      }
      return base44.entities.CartItem.update(itemId, { quantity: newQuantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart-items']);
    }
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const deletePromises = cartItems.map(item => base44.entities.CartItem.delete(item.id));
      await Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart-items']);
    }
  });

  // Best-effort GPS fix so drivers can be radius-matched to this delivery
  // (see FoodDriverHub/geoUtils.filterNearbyRequests) — same approach
  // UnifiedBookingModal already uses for local_delivery orders.
  useEffect(() => {
    if (!showPayment || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCustomerCoords([pos.coords.latitude, pos.coords.longitude]),
      () => setCustomerCoords(null),
      { timeout: 5000 }
    );
  }, [showPayment]);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.menu_item_price * item.quantity), 0);
  const deliveryFee = restaurant?.delivery_fee || 3.99;
  const total = subtotal + deliveryFee;
  const totalItemCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  const buildCheckoutBody = (extra) => ({
    order_type: 'food_order',
    amount: subtotal,
    provider_email: restaurant?.owner_email || restaurant?.created_by || '',
    item_id: restaurant?.id,
    item_title: `${totalItemCount} item${totalItemCount !== 1 ? 's' : ''} from ${restaurant?.name || 'restaurant'}`,
    quantity: totalItemCount,
    delivery_address: deliveryAddress,
    customer_notes: specialInstructions,
    customer_phone: currentUser?.phone || currentUser?.provider_phone || '',
    restaurant_address: restaurant?.address || '',
    restaurant_phone: restaurant?.phone || '',
    estimated_delivery_time: restaurant?.estimated_delivery_time || '',
    delivery_fee: deliveryFee,
    delivery_coords: customerCoords,
    items: cartItems.map(item => ({
      menu_item_id: item.menu_item_id,
      name: item.menu_item_name,
      price: item.menu_item_price,
      quantity: item.quantity,
    })),
    ...extra,
  });

  const finalizeOrder = async (newOrderId, intentId) => {
    try {
      // Dispatch: creates the DeliveryOrder that makes this order
      // dispatchable to a driver. Non-fatal — the order itself is already
      // placed and paid for even if dispatch has a hiccup.
      await dispatchFoodOrder({
        food_order_id: newOrderId,
        payment_intent_id: intentId || paymentIntentId || ''
      });
    } catch (err) {
      console.warn('Dispatch non-fatal error:', err);
    }

    await clearCartMutation.mutateAsync();
    toast.success('Order placed! Restaurant and drivers notified.');
    navigate(createPageUrl("FoodOrderTracking") + `?id=${newOrderId}`);
  };

  const initiatePayment = async () => {
    setProcessing(true);
    try {
      if (paymentMethod === 'wallet') {
        const res = await base44.functions.invoke('processUnifiedCheckout', buildCheckoutBody({ payment_method: 'wallet' }));
        const data = res?.data || res;
        if (data?.error) throw new Error(data.error);
        await finalizeOrder(data.order_id);
      } else {
        const res = await base44.functions.invoke('processUnifiedCheckout', buildCheckoutBody({ payment_method: 'stripe' }));
        const data = res?.data || res;
        if (data?.error) throw new Error(data.error);
        if (!data?.client_secret || !data?.publishable_key) throw new Error('Payment setup failed — missing credentials');
        const stripe = await loadStripe(data.publishable_key);
        setStripePromise(stripe);
        setClientSecret(data.client_secret);
        setPaymentIntentId(data.payment_intent_id);
      }
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const onStripeSuccess = async (intentId) => {
    setProcessing(true);
    try {
      const res = await base44.functions.invoke('processUnifiedCheckout', buildCheckoutBody({
        payment_method: 'stripe',
        confirm_payment_intent_id: intentId,
      }));
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      await finalizeOrder(data.order_id, intentId);
    } catch (err) {
      toast.error(err.message || 'Failed to finalize order');
    } finally {
      setProcessing(false);
    }
  };

  if (cartItems.length === 0 && !showPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-pink-950 p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold text-white mb-4">Your cart is empty</h1>
          <p className="text-gray-300 mb-6">Add items from restaurants to get started</p>
          <Button onClick={() => navigate(createPageUrl("FoodDelivery"))} className="bg-orange-600 hover:bg-orange-700">
            Browse Restaurants
          </Button>
        </div>
      </div>
    );
  }

  if (showPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-pink-950 p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => { setShowPayment(false); setClientSecret(null); setStripePromise(null); }}
            className="mb-4 p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 space-y-5">
            <h2 className="text-2xl font-bold text-white mb-2">Complete Payment</h2>

            <div className="space-y-2 text-sm bg-white/5 rounded-xl p-4">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Delivery Fee</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {!clientSecret && (
              <>
                <label className="text-gray-300 text-sm font-medium block">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'stripe', label: 'Card / Bank', icon: CreditCard, desc: 'Visa, Mastercard, ACH' },
                    { value: 'wallet', label: 'SoFlo Wallet', icon: Wallet, desc: `Balance: $${parseFloat(currentUser?.usd_balance || 0).toFixed(2)}` },
                  ].map(pm => (
                    <button
                      key={pm.value}
                      onClick={() => setPaymentMethod(pm.value)}
                      className={`p-4 rounded-xl border transition text-left ${paymentMethod === pm.value ? 'border-orange-500 bg-orange-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                    >
                      <pm.icon className={`w-5 h-5 mb-2 ${paymentMethod === pm.value ? 'text-orange-400' : 'text-gray-400'}`} />
                      <p className="text-white font-semibold text-sm">{pm.label}</p>
                      <p className="text-gray-400 text-xs">{pm.desc}</p>
                    </button>
                  ))}
                </div>

                {paymentMethod === 'wallet' && parseFloat(currentUser?.usd_balance || 0) < subtotal && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">Insufficient balance. Need ${(subtotal - parseFloat(currentUser?.usd_balance || 0)).toFixed(2)} more.</p>
                  </div>
                )}

                <Button
                  onClick={initiatePayment}
                  disabled={processing || (paymentMethod === 'wallet' && parseFloat(currentUser?.usd_balance || 0) < subtotal)}
                  className="w-full bg-orange-600 hover:bg-orange-700 py-6 text-lg"
                >
                  {processing ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
                  ) : (
                    <>{paymentMethod === 'wallet' ? <Wallet className="w-5 h-5 mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />} Pay ${total.toFixed(2)}</>
                  )}
                </Button>
              </>
            )}

            {clientSecret && stripePromise && (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#f97316' } } }}>
                <StripeCheckoutForm
                  amount={total}
                  onSuccess={onStripeSuccess}
                  onCancel={() => { setClientSecret(null); setStripePromise(null); }}
                  isProcessing={processing}
                  setIsProcessing={setProcessing}
                />
              </Elements>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-pink-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(createPageUrl("FoodDelivery"))}
            className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Your Cart</h1>
        </div>

        {restaurant && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 mb-6">
            <h2 className="text-xl font-bold text-white mb-1">{restaurant.name}</h2>
            <div className="flex flex-wrap gap-3 mt-2">
              {restaurant.address && (
                <div className="flex items-center gap-1 text-gray-300 text-sm">
                  <Store className="w-4 h-4 text-orange-400" />
                  {restaurant.address}
                </div>
              )}
              {restaurant.estimated_delivery_time && (
                <div className="flex items-center gap-1 text-gray-300 text-sm">
                  <Clock className="w-4 h-4 text-orange-400" />
                  {restaurant.estimated_delivery_time}
                </div>
              )}
              {restaurant.phone && (
                <div className="flex items-center gap-1 text-gray-300 text-sm">
                  <Phone className="w-4 h-4 text-orange-400" />
                  {restaurant.phone}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {cartItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">{item.menu_item_name}</h3>
                <p className="text-orange-400 font-bold">${item.menu_item_price.toFixed(2)}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-orange-600 rounded-full px-3 py-2">
                  <button
                    onClick={() => updateQuantityMutation.mutate({ itemId: item.id, newQuantity: item.quantity - 1 })}
                    className="text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-white font-bold min-w-[20px] text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantityMutation.mutate({ itemId: item.id, newQuantity: item.quantity + 1 })}
                    className="text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => updateQuantityMutation.mutate({ itemId: item.id, newQuantity: 0 })}
                  className="p-2 hover:bg-red-500/20 rounded-full transition"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Delivery Details
          </h3>

          <Input
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Enter delivery address"
            className="mb-4 bg-white/10 border-white/20 text-white placeholder-gray-400"
          />

          <Textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Special instructions (optional)"
            className="bg-white/10 border-white/20 text-white placeholder-gray-400"
          />
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Order Summary</h3>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-gray-300">
              <span>Subtotal ({totalItemCount} item{totalItemCount !== 1 ? 's' : ''})</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Delivery Fee</span>
              <span className="text-orange-300">${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="h-px bg-white/20 my-2" />
            <div className="flex justify-between text-white text-xl font-bold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <p className="text-gray-500 text-xs text-center mt-1">Delivery fee set by restaurant · Platform commission charged to merchant</p>
          </div>
        </div>

        <Button
          onClick={() => setShowPayment(true)}
          disabled={!deliveryAddress}
          className="w-full bg-orange-600 hover:bg-orange-700 py-6 text-lg"
        >
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}

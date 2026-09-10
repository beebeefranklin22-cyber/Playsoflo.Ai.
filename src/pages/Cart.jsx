import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, X, Wallet, CreditCard, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import StripeCheckoutForm from "@/components/payment/StripeCheckoutForm";
import { checkoutCart } from "@/functions/checkoutCart";

export default function Cart() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = React.useState(null);
  const [paymentMethod, setPaymentMethod] = React.useState("wallet");
  const [processing, setProcessing] = React.useState(false);
  const [stripePromise, setStripePromise] = React.useState(null);
  const [clientSecret, setClientSecret] = React.useState(null);
  const [orderComplete, setOrderComplete] = React.useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => navigate(createPageUrl("Home")));
  }, []);

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cart', currentUser?.email],
    queryFn: () => base44.entities.Cart.filter({ user_email: currentUser.email }),
    enabled: !!currentUser
  });

  const { data: savedCards = [] } = useQuery({
    queryKey: ['payment-methods-cards', currentUser?.email],
    queryFn: async () => {
      const methods = await base44.entities.PaymentMethod.filter({ user_email: currentUser.email, type: 'card', status: 'active' });
      return methods.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
    },
    enabled: !!currentUser
  });
  const [selectedCardId, setSelectedCardId] = React.useState(null);
  React.useEffect(() => {
    if (savedCards.length > 0 && !selectedCardId) setSelectedCardId(savedCards[0].id);
  }, [savedCards, selectedCardId]);

  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, quantity }) => base44.entities.Cart.update(id, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: (id) => base44.entities.Cart.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Item removed from cart');
    }
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(cartItems.map(item => base44.entities.Cart.delete(item.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Cart cleared');
    }
  });

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  // Mirrors PLATFORM_FEE_RATES.product_order in api/_lib/orderHelpers.js —
  // every cart item checks out as a product order, so this is the real fee
  // that will be charged, not an estimate.
  const platformFee = totalAmount * 0.15;
  const grandTotal = totalAmount + platformFee;

  const handleWalletCheckout = async () => {
    setProcessing(true);
    try {
      const { data } = await checkoutCart({ payment_method: 'wallet' });
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setOrderComplete(true);
    } catch (err) {
      toast.error(err.message || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleStripeInitiate = async () => {
    setProcessing(true);
    try {
      const { data } = await checkoutCart({ payment_method: 'stripe' });
      if (data?.error) throw new Error(data.error);
      if (!data?.client_secret || !data?.publishable_key) throw new Error('Payment setup failed — missing credentials');
      const stripe = await loadStripe(data.publishable_key);
      setStripePromise(stripe);
      setClientSecret(data.client_secret);
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleStripeSuccess = async (intentId) => {
    setProcessing(true);
    try {
      const { data } = await checkoutCart({ payment_method: 'stripe', confirm_payment_intent_id: intentId });
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setClientSecret(null);
      setStripePromise(null);
      setOrderComplete(true);
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleSavedCardCheckout = async () => {
    setProcessing(true);
    try {
      const { data } = await checkoutCart({ payment_method: 'stripe', saved_payment_method_id: selectedCardId });
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setOrderComplete(true);
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckout = () => {
    if (paymentMethod === 'wallet' && parseFloat(currentUser?.usd_balance || 0) < grandTotal) {
      toast.error('Insufficient wallet balance. Add funds or pay by card instead.');
      return;
    }
    if (paymentMethod === 'wallet') {
      handleWalletCheckout();
    } else if (paymentMethod === 'saved_card') {
      if (!selectedCardId) { toast.error('Select a saved card'); return; }
      handleSavedCardCheckout();
    } else {
      handleStripeInitiate();
    }
  };

  // Group by item type
  const groupedItems = cartItems.reduce((acc, item) => {
    if (!acc[item.item_type]) acc[item.item_type] = [];
    acc[item.item_type].push(item);
    return acc;
  }, {});

  const typeLabels = {
    marketplace: "Marketplace Items",
    food: "Food Orders",
    ticket: "Tickets & Events",
    service: "Services",
    rental: "Rentals",
    product: "Products"
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="glass-effect border-white/10 max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Order placed!</h2>
            <p className="text-gray-400 mb-6">Your order has been confirmed and the seller has been notified.</p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate(createPageUrl("Marketplace"))}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Continue Shopping
              </Button>
              <Button
                variant="outline"
                className="border-white/20"
                onClick={() => navigate(createPageUrl("Wallet"))}
              >
                View Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="glass-effect border-white/10 max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <ShoppingCart className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
            <p className="text-gray-400 mb-6">Start adding items to your cart!</p>
            <Button
              onClick={() => navigate(createPageUrl("Marketplace"))}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ShoppingCart className="w-8 h-8" />
              Shopping Cart
            </h1>
            <p className="text-gray-400 mt-1">{totalItems} items</p>
          </div>
          {cartItems.length > 0 && (
            <Button
              onClick={() => clearCartMutation.mutate()}
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cart
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(groupedItems).map(([type, items]) => (
              <Card key={type} className="glass-effect border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">{typeLabels[type]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="flex gap-4 p-4 bg-white/5 rounded-xl"
                    >
                      {item.item_image && (
                        <img
                          src={item.item_image}
                          alt={item.item_name}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{item.item_name}</h3>
                        <p className="text-purple-400 font-bold mt-1">${item.price.toFixed(2)}</p>
                        {item.notes && (
                          <p className="text-gray-400 text-sm mt-1">{item.notes}</p>
                        )}
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) {
                              updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity - 1 });
                            }
                          }}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                        >
                          <Minus className="w-4 h-4 text-white" />
                        </button>
                        <span className="text-white font-bold w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItemMutation.mutate(item.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition"
                      >
                        <X className="w-5 h-5 text-red-400" />
                      </button>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <Card className="glass-effect border-white/10 sticky top-20">
              <CardHeader>
                <CardTitle className="text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal ({totalItems} items)</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Service Fee (15%)</span>
                    <span>${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 mt-2">
                    <div className="flex justify-between text-white font-bold text-lg">
                      <span>Total</span>
                      <span>${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {!clientSecret && (
                  <>
                    <div className={`grid gap-2 ${savedCards.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      <button
                        onClick={() => setPaymentMethod('wallet')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                          paymentMethod === 'wallet' ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <Wallet className="w-5 h-5 text-purple-400" />
                        <span className="text-white text-sm font-medium">Wallet</span>
                        <span className="text-gray-400 text-xs">${(currentUser?.usd_balance || 0).toFixed(2)} available</span>
                      </button>
                      {savedCards.length > 0 && (
                        <button
                          onClick={() => setPaymentMethod('saved_card')}
                          className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                            paymentMethod === 'saved_card' ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 bg-white/5'
                          }`}
                        >
                          <CreditCard className="w-5 h-5 text-purple-400" />
                          <span className="text-white text-sm font-medium">Saved Card</span>
                          <span className="text-gray-400 text-xs">{savedCards.length} on file</span>
                        </button>
                      )}
                      <button
                        onClick={() => setPaymentMethod('stripe')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                          paymentMethod === 'stripe' ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-purple-400" />
                        <span className="text-white text-sm font-medium">New Card</span>
                        <span className="text-gray-400 text-xs">Visa, Mastercard...</span>
                      </button>
                    </div>

                    {paymentMethod === 'wallet' && parseFloat(currentUser?.usd_balance || 0) < grandTotal && (
                      <p className="text-amber-400 text-xs text-center">Insufficient wallet balance — pay by card instead.</p>
                    )}

                    {paymentMethod === 'saved_card' && (
                      <div className="space-y-2">
                        {savedCards.map((card) => (
                          <button
                            key={card.id}
                            onClick={() => setSelectedCardId(card.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition ${
                              selectedCardId === card.id ? 'border-purple-500 bg-purple-500/20' : 'border-white/10 bg-white/5'
                            }`}
                          >
                            <span className="text-white text-sm capitalize">{card.card_details?.brand} •••• {card.card_details?.last4}</span>
                            <span className="text-gray-400 text-xs">{String(card.card_details?.exp_month).padStart(2, '0')}/{card.card_details?.exp_year}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <Button
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      onClick={handleCheckout}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Proceed to Checkout
                      {!processing && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full border-white/20"
                      onClick={() => navigate(createPageUrl("Marketplace"))}
                    >
                      Continue Shopping
                    </Button>
                  </>
                )}

                {clientSecret && stripePromise && (
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#8b5cf6' } } }}>
                    <StripeCheckoutForm
                      amount={grandTotal}
                      onSuccess={handleStripeSuccess}
                      onCancel={() => { setClientSecret(null); setStripePromise(null); }}
                      isProcessing={processing}
                      setIsProcessing={setProcessing}
                    />
                  </Elements>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Wallet, DollarSign, CheckCircle, Loader2, Shield, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

/* ── Inline card form ── */
function InlineCardForm({ currentUser, totalFare, onSuccess, onBack }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [name, setName] = useState(currentUser?.full_name || "");

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) { toast.error("Payment form not ready"); return; }
    if (!name.trim()) { toast.error("Enter cardholder name"); return; }
    setProcessing(true);
    toast.loading("Processing payment…");
    try {
      const cardElement = elements.getElement(CardElement);
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: { name, email: currentUser?.email },
      });
      if (error) throw new Error(error.message);

      // Record payment
      await base44.entities.Payment.create({
        amount_usd: totalFare,
        method: "card",
        status: "completed",
        reference_type: "other",
        memo: `Ride payment - card ${paymentMethod.card.last4}`
      });

      toast.dismiss();
      toast.success("Payment confirmed!");
      onSuccess();
    } catch (err) {
      toast.dismiss();
      toast.error(err.message || "Payment failed");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div>
        <label className="text-gray-400 text-sm mb-1.5 block">Cardholder Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name on card"
          className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
        />
      </div>
      <div>
        <label className="text-gray-400 text-sm mb-1.5 block">Card Details</label>
        <div className="bg-white rounded-xl p-4">
          <CardElement options={{
            style: {
              base: { fontSize: "16px", color: "#000", "::placeholder": { color: "#6b7280" } },
              invalid: { color: "#ef4444" }
            },
            hidePostalCode: false,
          }} />
        </div>
      </div>
      <p className="text-gray-500 text-xs flex items-center gap-1">
        <Shield className="w-3 h-3" /> Secured by Stripe — Visa, MC, Amex, Discover
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1 border-white/20 text-white" disabled={processing}>Back</Button>
        <Button type="submit" className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600" disabled={!stripe || processing}>
          {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</> : `Pay $${totalFare.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
}

export default function PaymentConfirmationModal({ open, onClose, onConfirm, rideDetails, currentUser }) {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [showCardForm, setShowCardForm] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loadingStripe, setLoadingStripe] = useState(false);

  const { data: walletBalance = 0 } = useQuery({
    queryKey: ['wallet-balance', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return 0;
      const user = await base44.auth.me();
      return user.balance || 0;
    },
    enabled: !!currentUser
  });

  const { data: savedMethods = [] } = useQuery({
    queryKey: ['payment-methods', currentUser?.email],
    queryFn: () => base44.entities.PaymentMethod.filter({ user_email: currentUser.email, status: 'active' }),
    enabled: !!currentUser
  });

  const defaultCard = savedMethods.find(m => m.type === 'card' && m.card_details);

  const loadStripeForm = async () => {
    if (stripePromise) { setShowCardForm(true); return; }
    setLoadingStripe(true);
    try {
      const { data } = await base44.functions.invoke('createSetupIntent', {});
      if (!data?.publishable_key || !data?.client_secret) throw new Error("Server error");
      const sp = await loadStripe(data.publishable_key);
      setStripePromise(sp);
      setClientSecret(data.client_secret);
      setShowCardForm(true);
    } catch (err) {
      toast.error("Could not load card form: " + err.message);
    } finally {
      setLoadingStripe(false);
    }
  };

  const handlePayment = async () => {
    if (!rideDetails || !rideDetails.totalFare || rideDetails.totalFare <= 0) {
      toast.error("Invalid ride details. Please recalculate route.");
      return;
    }

    if (paymentMethod === "card" && !defaultCard) {
      await loadStripeForm();
      return;
    }

    setProcessing(true);
    try {
      if (paymentMethod === "wallet") {
        if (walletBalance < rideDetails.totalFare) {
          toast.error("Insufficient wallet balance. Please use a card.");
          setProcessing(false);
          return;
        }
        const newBalance = walletBalance - rideDetails.totalFare;
        await base44.auth.updateMe({ balance: newBalance });
      }

      await base44.entities.Payment.create({
        amount_usd: rideDetails.totalFare,
        method: paymentMethod === "card" ? "card" : "internal_transfer",
        status: "completed",
        reference_type: "other",
        memo: `Ride from ${rideDetails.pickup} to ${rideDetails.dropoff}`
      });

      toast.success("✅ Payment confirmed! Finding your driver...", { position: "bottom-center", duration: 4000 });
      onClose(); // close payment modal first
      await onConfirm(); // then trigger ride creation
    } catch (error) {
      toast.error("Payment failed: " + (error.message || "Unknown error"), { position: "bottom-center" });
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Confirm Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ride Summary */}
          <div className="bg-white/5 rounded-lg p-4 space-y-2 border border-white/10">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Vehicle Type</span>
              <span className="text-white font-semibold">{rideDetails?.vehicleName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Distance</span>
              <span className="text-white">{rideDetails?.distance} mi</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Duration</span>
              <span className="text-white">{rideDetails?.duration} min</span>
            </div>
            <div className="border-t border-white/10 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-white font-bold">Total Fare</span>
                <span className="text-white font-bold text-xl">${rideDetails?.totalFare?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Show inline card form if selected */}
          {showCardForm && stripePromise && clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <InlineCardForm
                currentUser={currentUser}
                totalFare={rideDetails?.totalFare || 0}
                onSuccess={async () => {
                  setShowCardForm(false);
                  onClose(); // close payment modal first
                  await onConfirm(); // then trigger ride creation
                }}
                onBack={() => setShowCardForm(false)}
              />
            </Elements>
          ) : (
            <>
              {/* Payment Method Selection */}
              <div className="space-y-2">
                <h4 className="text-white font-semibold text-sm mb-3">Payment Method</h4>

                <button
                  onClick={() => setPaymentMethod("wallet")}
                  className={`w-full p-4 rounded-lg border transition ${
                    paymentMethod === "wallet" ? "bg-blue-600/20 border-blue-500" : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-blue-400" />
                      <div className="text-left">
                        <div className="text-white font-medium">SoFlo Wallet</div>
                        <div className="text-gray-400 text-xs">Balance: ${walletBalance.toFixed(2)}</div>
                      </div>
                    </div>
                    {paymentMethod === "wallet" && <CheckCircle className="w-5 h-5 text-blue-400" />}
                  </div>
                </button>

                {/* Saved Card */}
                {defaultCard && (
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`w-full p-4 rounded-lg border transition ${
                      paymentMethod === "card" ? "bg-purple-600/20 border-purple-500" : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-purple-400" />
                        <div className="text-left">
                          <div className="text-white font-medium capitalize">{defaultCard.card_details?.brand} •••• {defaultCard.card_details?.last4}</div>
                          <div className="text-gray-400 text-xs">Expires {defaultCard.card_details?.exp_month}/{defaultCard.card_details?.exp_year}</div>
                        </div>
                      </div>
                      {paymentMethod === "card" && <CheckCircle className="w-5 h-5 text-purple-400" />}
                    </div>
                  </button>
                )}

                {/* New Card Option */}
                <button
                  onClick={() => { setPaymentMethod("card"); loadStripeForm(); }}
                  className="w-full p-3 rounded-lg border border-dashed border-white/20 hover:border-white/40 transition flex items-center justify-center gap-2 text-gray-400 hover:text-white text-sm"
                  disabled={loadingStripe}
                >
                  {loadingStripe ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {loadingStripe ? "Loading…" : "Pay with New Card"}
                </button>

                {paymentMethod === "wallet" && walletBalance < (rideDetails?.totalFare || 0) && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-400 text-sm">
                      Insufficient balance. Add ${((rideDetails?.totalFare || 0) - walletBalance).toFixed(2)} or use a card.
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={handlePayment}
                disabled={processing}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-6 text-lg font-bold"
              >
                {processing ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                ) : (
                  <><DollarSign className="w-5 h-5 mr-2" />Confirm & Request Ride — ${rideDetails?.totalFare?.toFixed(2)}</>
                )}
              </Button>
              <p className="text-center text-gray-400 text-xs">🎉 15% cheaper than Uber • Save on every ride</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
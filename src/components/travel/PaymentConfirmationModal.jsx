import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Wallet, DollarSign, CheckCircle, Loader2, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import StripeCheckoutForm from "@/components/payment/StripeCheckoutForm";
import { requestRideSecure } from "@/functions/requestRideSecure";

// rideDetails carries both the display summary (vehicleName, distance,
// duration, totalFare) and the raw fields api/rides.js's request_ride
// action needs to actually create + charge the ride
// (pickup_address, dropoff_address, vehicle_class_details, coords, etc).
export default function PaymentConfirmationModal({ open, onClose, onConfirm, rideDetails, currentUser }) {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loadingStripe, setLoadingStripe] = useState(false);

  const { data: walletBalance = 0 } = useQuery({
    queryKey: ['wallet-balance', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return 0;
      const user = await base44.auth.me();
      return user.usd_balance || 0;
    },
    enabled: !!currentUser
  });

  const { data: savedMethods = [] } = useQuery({
    queryKey: ['payment-methods', currentUser?.email],
    queryFn: () => base44.entities.PaymentMethod.filter({ user_email: currentUser.email, status: 'active' }),
    enabled: !!currentUser
  });

  const defaultCard = savedMethods.find(m => m.type === 'card' && m.card_details);

  const ridePayload = () => ({
    pickup_address: rideDetails?.pickup,
    dropoff_address: rideDetails?.dropoff,
    ride_type: rideDetails?.ride_type,
    vehicle_class_details: rideDetails?.vehicle_class_details,
    is_shared: rideDetails?.is_shared,
    max_passengers: rideDetails?.max_passengers,
    is_for_someone_else: rideDetails?.is_for_someone_else,
    recipient_name: rideDetails?.recipient_name,
    recipient_phone: rideDetails?.recipient_phone,
    pickup_coords: rideDetails?.pickup_coords,
    dropoff_coords: rideDetails?.dropoff_coords,
    route_geometry: rideDetails?.route_geometry,
    estimated_distance_miles: rideDetails?.estimated_distance_miles,
    estimated_duration_minutes: rideDetails?.estimated_duration_minutes,
    rider_preferences: rideDetails?.rider_preferences,
  });

  const finish = async (ride) => {
    setClientSecret(null);
    setStripePromise(null);
    onClose();
    await onConfirm(ride);
  };

  const handleWalletPay = async () => {
    if (walletBalance < (rideDetails?.totalFare || 0)) {
      toast.error("Insufficient wallet balance. Please use a card.");
      return;
    }
    setProcessing(true);
    try {
      const { data } = await requestRideSecure({ ...ridePayload(), payment_method: 'wallet' });
      if (data?.error) throw new Error(data.error);
      toast.success("✅ Payment confirmed! Finding your driver...", { position: "bottom-center", duration: 4000 });
      await finish(data.ride);
    } catch (error) {
      toast.error("Payment failed: " + (error.message || "Unknown error"), { position: "bottom-center" });
    } finally {
      setProcessing(false);
    }
  };

  const handleSavedCardPay = async () => {
    setProcessing(true);
    try {
      const { data } = await requestRideSecure({ ...ridePayload(), payment_method: 'card', saved_payment_method_id: defaultCard.id });
      if (data?.error) throw new Error(data.error);
      toast.success("✅ Payment confirmed! Finding your driver...", { position: "bottom-center", duration: 4000 });
      await finish(data.ride);
    } catch (error) {
      toast.error("Payment failed: " + (error.message || "Unknown error"), { position: "bottom-center" });
    } finally {
      setProcessing(false);
    }
  };

  const loadNewCardForm = async () => {
    setLoadingStripe(true);
    try {
      const { data } = await requestRideSecure({ ...ridePayload(), payment_method: 'card' });
      if (data?.error) throw new Error(data.error);
      if (!data?.needsClientAction || !data?.client_secret || !data?.publishable_key) {
        throw new Error("Server error setting up payment");
      }
      const sp = await loadStripe(data.publishable_key);
      setStripePromise(sp);
      setClientSecret(data.client_secret);
    } catch (err) {
      toast.error("Could not load card form: " + err.message);
    } finally {
      setLoadingStripe(false);
    }
  };

  const handleNewCardSuccess = async (paymentIntentId) => {
    setProcessing(true);
    try {
      const { data } = await requestRideSecure({ ...ridePayload(), payment_method: 'card', confirm_payment_intent_id: paymentIntentId });
      if (data?.error) throw new Error(data.error);
      toast.success("✅ Payment confirmed! Finding your driver...", { position: "bottom-center", duration: 4000 });
      await finish(data.ride);
    } catch (error) {
      toast.error("Payment failed: " + (error.message || "Unknown error"), { position: "bottom-center" });
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!rideDetails || !rideDetails.totalFare || rideDetails.totalFare <= 0) {
      toast.error("Invalid ride details. Please recalculate route.");
      return;
    }
    if (paymentMethod === "wallet") return handleWalletPay();
    if (paymentMethod === "card" && defaultCard) return handleSavedCardPay();
    return loadNewCardForm();
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

          {/* Show inline card form if a new-card PaymentIntent was created */}
          {clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#8b5cf6' } } }}>
              <StripeCheckoutForm
                amount={rideDetails?.totalFare || 0}
                onSuccess={handleNewCardSuccess}
                onCancel={() => { setClientSecret(null); setStripePromise(null); }}
                isProcessing={processing}
                setIsProcessing={setProcessing}
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
                  onClick={() => { setPaymentMethod("card"); loadNewCardForm(); }}
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
                disabled={processing || loadingStripe}
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

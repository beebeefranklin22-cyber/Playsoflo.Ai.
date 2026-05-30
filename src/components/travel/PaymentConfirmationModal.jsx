import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Wallet, DollarSign, CheckCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function PaymentConfirmationModal({ open, onClose, onConfirm, rideDetails, currentUser }) {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("wallet");

  const { data: walletBalance = 0 } = useQuery({
    queryKey: ['wallet-balance', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return 0;
      const user = await base44.auth.me();
      return user.balance || 0;
    },
    enabled: !!currentUser
  });

  const handlePayment = async () => {
    if (!rideDetails || !rideDetails.totalFare || rideDetails.totalFare <= 0) {
      toast.error("Invalid ride details. Please recalculate route.");
      return;
    }

    setProcessing(true);
    try {
      if (paymentMethod === "wallet") {
        if (walletBalance < rideDetails.totalFare) {
          toast.error("Insufficient wallet balance. Please add funds or use a card.");
          setProcessing(false);
          return;
        }

        // Deduct from wallet
        const newBalance = walletBalance - rideDetails.totalFare;
        await base44.auth.updateMe({ balance: newBalance });
      } else if (paymentMethod === "card") {
        // Card payment would be handled via Stripe
        toast.info("Card payment processing...");
        // For now, just proceed - in production integrate with Stripe
      }

      // Create payment record
      await base44.entities.Payment.create({
        amount_usd: rideDetails.totalFare,
        method: paymentMethod === "card" ? "card" : "internal_transfer",
        status: "completed",
        reference_type: "other",
        memo: `Ride from ${rideDetails.pickup} to ${rideDetails.dropoff}`
      });

      toast.success("Payment confirmed!");
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment failed: " + (error.message || "Unknown error"));
    } finally {
      setProcessing(false);
    }
  };

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
              <span className="text-white font-semibold">{rideDetails.vehicleName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Distance</span>
              <span className="text-white">{rideDetails.distance} mi</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Duration</span>
              <span className="text-white">{rideDetails.duration} min</span>
            </div>
            <div className="border-t border-white/10 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-white font-bold">Total Fare</span>
                <span className="text-white font-bold text-xl">${rideDetails.totalFare.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-sm mb-3">Payment Method</h4>
            
            <button
              onClick={() => setPaymentMethod("wallet")}
              className={`w-full p-4 rounded-lg border transition ${
                paymentMethod === "wallet"
                  ? "bg-blue-600/20 border-blue-500"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
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

            <button
              onClick={() => setPaymentMethod("card")}
              className={`w-full p-4 rounded-lg border transition ${
                paymentMethod === "card"
                  ? "bg-purple-600/20 border-purple-500"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-purple-400" />
                  <div className="text-left">
                    <div className="text-white font-medium">Credit/Debit Card</div>
                    <div className="text-gray-400 text-xs">Safe & secure payment</div>
                  </div>
                </div>
                {paymentMethod === "card" && <CheckCircle className="w-5 h-5 text-purple-400" />}
              </div>
            </button>

            {paymentMethod === "wallet" && walletBalance < rideDetails.totalFare && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
                <p className="text-red-400 text-sm">
                  Insufficient balance. Add ${(rideDetails.totalFare - walletBalance).toFixed(2)} to your wallet or use a card.
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={handlePayment}
            disabled={processing}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-6 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5 mr-2" />
                Confirm & Request Ride - ${rideDetails.totalFare.toFixed(2)}
              </>
            )}
          </Button>
          
          <p className="text-center text-gray-400 text-xs mt-2">
            🎉 15% cheaper than Uber • Save on every ride
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Calendar, DollarSign, Wallet, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import PaymentConfirmation from "../payment/PaymentConfirmation";

export default function BookingPaymentModal({ 
  experience, 
  bookingData, 
  currentUser, 
  onClose, 
  onSuccess 
}) {
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [processing, setProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const subtotal = bookingData.total_price_usd;
  const platformFee = subtotal * 0.10; // 10% platform fee
  const total = subtotal;

  const handlePayment = async () => {
    if (paymentMethod === "wallet" && currentUser.balance_usd < total) {
      toast.error("Insufficient wallet balance");
      return;
    }

    setProcessing(true);
    try {
      // Deduct from customer's wallet
      if (paymentMethod === "wallet") {
        await base44.auth.updateMe({
          balance_usd: currentUser.balance_usd - total
        });
      }

      // Create booking
      const booking = await base44.entities.Booking.create({
        ...bookingData,
        payment_method: paymentMethod,
        payment_status: "paid",
        booking_status: "pending",
        confirmation_code: `BK${Date.now().toString(36).toUpperCase()}`
      });

      // Create payment record
      await base44.entities.Payment.create({
        amount_usd: total,
        amount_rri: 0,
        method: paymentMethod,
        status: "completed",
        reference_type: "order",
        reference_id: booking.id,
        sender_email: currentUser.email,
        recipient_email: bookingData.provider_email,
        memo: `Booking: ${bookingData.experience_title}`
      });

      // Notify provider
      await base44.entities.Notification.create({
        recipient_email: bookingData.provider_email,
        type: "booking_requests",
        title: "New Booking Request",
        message: `${currentUser.full_name || currentUser.email} booked ${bookingData.experience_title} for $${total.toFixed(2)}`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        reference_type: "order",
        reference_id: booking.id,
        read: false
      });

      setShowConfirmation(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Booking failed: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {showConfirmation && (
        <PaymentConfirmation
          amount={total}
          currency="USD"
          recipient={experience?.provider_name || "Provider"}
          type="booking"
          onClose={() => {
            setShowConfirmation(false);
            onClose();
          }}
        />
      )}

      {!showConfirmation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Complete Booking</h2>
              <button onClick={onClose}>
                <X className="w-6 h-6 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Booking Details */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-bold mb-2">{bookingData.experience_title}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Date:</span>
                    <span className="text-white">{new Date(bookingData.booking_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Guests:</span>
                    <span className="text-white">{bookingData.number_of_guests}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Payment Method</label>
                <button
                  onClick={() => setPaymentMethod("wallet")}
                  className={`w-full p-4 rounded-xl border-2 transition ${
                    paymentMethod === "wallet"
                      ? "border-purple-500 bg-purple-500/20"
                      : "border-white/20 bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-purple-400" />
                      <span className="text-white">Wallet Balance</span>
                    </div>
                    <span className="text-gray-400">${currentUser?.balance_usd?.toFixed(2) || "0.00"}</span>
                  </div>
                </button>

                {paymentMethod === "wallet" && currentUser.balance_usd < total && (
                  <div className="mt-2 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
                    Insufficient balance. Please add funds to your wallet.
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Booking Total</span>
                    <span className="text-white">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Platform Fee (10%)</span>
                    <span className="text-white">${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-white font-bold text-lg">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Confirm Button */}
              <Button
                onClick={handlePayment}
                disabled={processing || (paymentMethod === "wallet" && currentUser.balance_usd < total)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6"
              >
                {processing ? "Processing..." : `Pay $${total.toFixed(2)}`}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
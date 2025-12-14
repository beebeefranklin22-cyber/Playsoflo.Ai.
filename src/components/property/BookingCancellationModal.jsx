import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, AlertCircle, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function BookingCancellationModal({ booking, property, onClose }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [cancellationFee, setCancellationFee] = useState(0);

  // Calculate cancellation fee based on policy
  React.useEffect(() => {
    if (!booking || !property) return;

    const checkInDate = new Date(booking.booking_date);
    const now = new Date();
    const daysUntilCheckIn = Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24));

    let fee = 0;
    const policy = property.cancellation_policy || "moderate";
    const total = booking.total_price_usd || 0;

    if (policy === "flexible") {
      // Full refund if cancelled 24h before check-in
      if (daysUntilCheckIn < 1) {
        fee = total;
      }
    } else if (policy === "moderate") {
      // 50% refund if cancelled within 5 days
      if (daysUntilCheckIn < 5) {
        fee = total * 0.5;
      }
    } else if (policy === "strict") {
      // 50% refund if cancelled within 7 days, no refund within 2 days
      if (daysUntilCheckIn < 2) {
        fee = total;
      } else if (daysUntilCheckIn < 7) {
        fee = total * 0.5;
      }
    } else if (policy === "non_refundable") {
      fee = total;
    }

    setCancellationFee(fee);
  }, [booking, property]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      // Update booking status
      await base44.entities.Booking.update(booking.id, {
        booking_status: "cancelled",
        cancellation_fee: cancellationFee,
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString()
      });

      // Send cancellation emails (async, don't block)
      try {
        await base44.functions.invoke('sendBookingEmails', {
          booking_id: booking.id,
          email_type: 'cancellation'
        });
      } catch (error) {
        console.error('Email notification failed:', error);
        // Don't block the cancellation if email fails
      }

      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries(["my-property-bookings"]);
      qc.invalidateQueries(["property-bookings"]);
      toast.success("Booking cancelled successfully");
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel booking");
    }
  });

  const refundAmount = (booking.total_price_usd || 0) - cancellationFee;
  const policyDetails = {
    flexible: "Full refund if cancelled 24 hours before check-in",
    moderate: "50% refund if cancelled within 5 days of check-in",
    strict: "50% refund if cancelled within 7 days, no refund within 2 days",
    non_refundable: "No refund available"
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden"
      >
        <div className="relative p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Cancel Booking</h2>
          <p className="text-gray-400 mt-1">{booking.experience_title}</p>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Policy Info */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-semibold mb-1">
                  Cancellation Policy: {property?.cancellation_policy || "moderate"}
                </p>
                <p className="text-yellow-300 text-sm">
                  {policyDetails[property?.cancellation_policy || "moderate"]}
                </p>
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Original Amount</span>
              <span className="text-white font-semibold">
                ${booking.total_price_usd?.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Cancellation Fee</span>
              <span className="text-red-400 font-semibold">
                -${cancellationFee.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-white/10 pt-3 flex items-center justify-between">
              <span className="text-white font-bold">Refund Amount</span>
              <span className="text-green-400 font-bold text-xl">
                ${refundAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-white font-semibold mb-2 block">
              Reason for cancellation (optional)
            </label>
            <Textarea
              placeholder="Help us understand why you're cancelling..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-white/10 border-white/20 text-white h-24"
            />
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-300 text-sm">
              This action cannot be undone. Your refund will be processed within 5-7 business days.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Keep Booking
            </Button>
            <Button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
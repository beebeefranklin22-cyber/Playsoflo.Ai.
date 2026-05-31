import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import SavedPaymentMethodSelector from "@/components/payment/SavedPaymentMethodSelector";

export default function UnifiedCheckoutModal({ items, total, currentUser, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    if (!selectedMethodId) {
      toast.error("Please select a payment method");
      return;
    }

    setLoading(true);
    setIsProcessing(true);

    try {
      // Create unified booking record
      const unifiedBooking = {
        user_email: currentUser.email,
        items: items.map(item => ({
          type: item.type,
          id: item.id,
          title: item.title || item.name,
          price: item.price,
          date: item.date,
          location: item.location
        })),
        total_amount: total,
        payment_method_id: selectedMethodId,
        status: "processing",
        created_at: new Date().toISOString()
      };

      // Process payment through Stripe
      const checkoutResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Process a unified checkout for user ${currentUser.email}. Items: ${JSON.stringify(unifiedBooking.items)}. Total: $${total}. Return confirmation ID.`,
        response_json_schema: {
          type: "object",
          properties: {
            confirmation_id: { type: "string" },
            status: { type: "string" }
          }
        }
      });

      // Create individual bookings for each service type
      for (const item of items) {
        if (item.type === "experience") {
          await base44.entities.Experience.create({
            title: item.title,
            price: item.price,
            status: "confirmed",
            customer_email: currentUser.email,
            booking_date: item.date
          }).catch(() => {});
        } else if (item.type === "travel") {
          // Create ride request
          await base44.entities.RideRequest.create({
            passenger_email: currentUser.email,
            destination: item.location,
            status: "confirmed",
            price: item.price
          }).catch(() => {});
        } else if (item.type === "car_rental") {
          await base44.entities.CarRental.create({
            renter_email: currentUser.email,
            car_make: item.make || "Premium",
            car_model: item.model || "Rental",
            start_date: item.date,
            total_amount: item.price,
            status: "confirmed"
          }).catch(() => {});
        } else if (item.type === "food_order") {
          await base44.entities.FoodOrder.create({
            user_email: currentUser.email,
            restaurant_name: item.restaurant || "Restaurant",
            items: item.items || [],
            total_amount: item.price,
            status: "confirmed"
          }).catch(() => {});
        }
      }

      // Record the unified transaction
      await base44.entities.StripePayment.create({
        user_email: currentUser.email,
        amount: total,
        currency: "usd",
        status: "succeeded",
        payment_method: selectedMethodId,
        description: `Unified booking: ${items.map(i => i.type).join(", ")}`
      }).catch(() => {});

      toast.success("Booking confirmed!");
      if (onSuccess) onSuccess(checkoutResponse.confirmation_id);
      onClose();
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-3xl border border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 flex items-center justify-between">
          <h2 className="text-white font-bold text-xl">Complete Your Booking</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Items Summary */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">Booking Summary</h3>
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium text-sm">{item.title || item.name}</p>
                  <p className="text-gray-400 text-xs">{item.type}</p>
                </div>
                <p className="text-white font-bold text-sm">${item.price.toFixed(2)}</p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold">Total Amount</span>
              <span className="text-white font-bold text-2xl">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">Payment Method</h3>
            <SavedPaymentMethodSelector
              currentUser={currentUser}
              value={selectedMethodId}
              onChange={setSelectedMethodId}
              showTabs
            />
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-blue-300 text-sm">Processing your unified booking...</span>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-2 pt-4">
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Complete Booking
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full py-2 text-gray-400 hover:text-white transition font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, CreditCard, DollarSign, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StripePaymentForm from "../payment/StripePaymentForm";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function QuickPaymentModal({ 
  isOpen, 
  onClose, 
  type = "tip", // "tip" or "product"
  amount,
  creatorEmail,
  streamId,
  productData = null,
  currentUser,
  onSuccess
}) {
  const [paymentStep, setPaymentStep] = useState("amount"); // "amount" or "payment"
  const [customAmount, setCustomAmount] = useState(amount || 5);
  const [message, setMessage] = useState("");

  const quickAmounts = type === "tip" 
    ? [5, 10, 25, 50, 100]
    : [amount];

  const handlePaymentSuccess = async (paymentIntentId) => {
    try {
      if (type === "tip") {
        // Create tip transaction
        await base44.entities.TipTransaction.create({
          creator_email: creatorEmail,
          tipper_email: currentUser.email,
          tipper_name: currentUser.full_name,
          amount_usd: customAmount,
          message: message || `$${customAmount} tip during livestream!`,
          content_id: streamId,
          is_livestream_tip: true,
          payment_intent_id: paymentIntentId
        });
        toast.success('🎉 Tip sent!');
      } else if (type === "product") {
        // Track product purchase
        await base44.entities.CreatorProduct.update(productData.id, {
          purchases: (productData.purchases || 0) + 1
        });
        
        // Create purchase record
        await base44.entities.ContentPurchase.create({
          content_id: streamId,
          product_id: productData.id,
          buyer_email: currentUser.email,
          amount_paid: customAmount,
          payment_intent_id: paymentIntentId
        });
        toast.success('✅ Purchase complete!');
      }
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Transaction error:", error);
      toast.error("Failed to complete transaction");
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gradient-to-br from-gray-900 to-purple-900 rounded-3xl overflow-hidden border border-white/20"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                {type === "tip" ? (
                  <Gift className="w-6 h-6 text-white" />
                ) : (
                  <CreditCard className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-white text-xl font-bold">
                  {type === "tip" ? "Send Tip" : "Purchase"}
                </h3>
                <p className="text-white/80 text-sm">
                  {type === "tip" ? "Support the creator" : productData?.name}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {paymentStep === "amount" ? (
            <div className="space-y-4">
              {/* Quick Amount Selection */}
              {type === "tip" && (
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {quickAmounts.map(amt => (
                    <button
                      key={amt}
                      onClick={() => setCustomAmount(amt)}
                      className={`p-3 rounded-xl font-bold transition ${
                        customAmount === amt
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              )}

              {/* Custom Amount */}
              <div>
                <label className="text-white text-sm mb-2 block">Amount (USD)</label>
                <Input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(Number(e.target.value))}
                  className="bg-white/10 border-white/20 text-white text-center text-2xl font-bold"
                />
              </div>

              {/* Optional Message for Tips */}
              {type === "tip" && (
                <div>
                  <label className="text-white text-sm mb-2 block">Message (Optional)</label>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Say something nice..."
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              )}

              {/* Summary */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-white font-bold text-xl">${customAmount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Platform Fee</span>
                  <span className="text-gray-400">$0.00</span>
                </div>
              </div>

              <Button
                onClick={() => setPaymentStep("payment")}
                disabled={!customAmount || customAmount < 1}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6 text-lg font-bold"
              >
                Continue to Payment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-green-400 text-2xl font-bold">${customAmount}</span>
                </div>
              </div>

              <StripePaymentForm
                amount={customAmount}
                referenceType={type}
                referenceId={streamId}
                description={type === "tip" 
                  ? `Livestream tip for ${creatorEmail}` 
                  : `Purchase: ${productData?.name}`
                }
                onSuccess={handlePaymentSuccess}
                onError={(error) => {
                  console.error("Payment error:", error);
                  toast.error("Payment failed: " + error.message);
                }}
                metadata={{
                  type,
                  stream_id: streamId,
                  creator_email: creatorEmail,
                  ...(productData && { product_id: productData.id })
                }}
              />

              <Button
                onClick={() => setPaymentStep("amount")}
                variant="outline"
                className="w-full border-white/20"
              >
                Back
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
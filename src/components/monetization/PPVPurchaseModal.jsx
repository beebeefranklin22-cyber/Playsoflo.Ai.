import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard, X, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import StripePaymentForm from "../payment/StripePaymentForm";

export default function PPVPurchaseModal({ content, currentUser, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState("info"); // info, payment, success

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      // Create purchase record
      const purchase = await base44.entities.PPVPurchase.create({
        user_email: currentUser.email,
        ppv_content_id: content.id,
        creator_email: content.creator_email,
        amount_paid_usd: content.price_usd,
        amount_paid_rri: 0,
        access_expires_at: new Date(Date.now() + content.access_duration_hours * 3600000).toISOString(),
        payment_method: "card"
      });

      // Update content stats
      await base44.entities.PPVContent.update(content.id, {
        total_purchases: (content.total_purchases || 0) + 1,
        revenue_generated: (content.revenue_generated || 0) + content.price_usd
      });

      // Notify creator
      await base44.entities.Notification.create({
        recipient_email: content.creator_email,
        type: "payment_received",
        title: "New PPV Purchase!",
        message: `Someone purchased "${content.title}" for $${content.price_usd}`,
        reference_type: "ppv",
        reference_id: purchase.id
      });

      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ppv-purchases']);
      queryClient.invalidateQueries(['ppv-content']);
      setStep("success");
    },
    onError: (error) => {
      toast.error("Purchase failed: " + error.message);
    }
  });

  const handlePaymentSuccess = () => {
    purchaseMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gray-900 rounded-3xl p-6 border border-white/20"
      >
        {step === "info" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Lock className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Unlock Premium Content</h3>
                  <p className="text-gray-400 text-sm">{content.title}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {content.thumbnail_url && (
              <img src={content.thumbnail_url} alt={content.title} className="w-full h-48 object-cover rounded-xl mb-4" />
            )}

            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="text-gray-300 text-sm mb-4">{content.description}</div>
              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-gray-400">One-time access</span>
                <span className="text-2xl font-bold text-white">${content.price_usd}</span>
              </div>
              <div className="text-gray-500 text-xs mt-2">
                Access for {content.access_duration_hours || 48} hours after purchase
              </div>
            </div>

            <Button
              onClick={() => setStep("payment")}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-6 text-lg font-bold"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Continue to Payment
            </Button>
          </>
        )}

        {step === "payment" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Payment</h3>
              <button onClick={() => setStep("info")} className="text-purple-400 text-sm">
                Back
              </button>
            </div>

            <StripePaymentForm
              amount={content.price_usd}
              referenceType="ppv_content"
              referenceId={content.id}
              description={`Purchase: ${content.title}`}
              onSuccess={handlePaymentSuccess}
              onError={(error) => toast.error(error.message)}
            />
          </>
        )}

        {step === "success" && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Purchase Complete!</h3>
            <p className="text-gray-400 mb-6">
              You now have access to this content for {content.access_duration_hours || 48} hours
            </p>
            <Button
              onClick={() => {
                onSuccess?.();
                onClose();
              }}
              className="bg-gradient-to-r from-green-600 to-emerald-600 px-8"
            >
              Start Watching
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
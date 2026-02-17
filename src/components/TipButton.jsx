import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, DollarSign, Coins, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TipButton({ 
  creatorEmail, 
  creatorName,
  contentId = null,
  variant = "default",
  size = "default",
  showAmount = true
}) {
  const queryClient = useQueryClient();
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(5);
  const [tipMessage, setTipMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("usd");
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const quickAmounts = [1, 5, 10, 25, 50, 100];

  const tipMutation = useMutation({
    mutationFn: async (tipData) => {
      const tip = await base44.entities.TipTransaction.create(tipData);
      
      // Send notification to creator
      await base44.entities.Notification.create({
        recipient_email: creatorEmail,
        type: "tip_received",
        title: `💰 New Tip Received!`,
        message: `${currentUser?.full_name || currentUser?.email} tipped you $${tipData.amount_usd}${
          tipData.message ? `: "${tipData.message}"` : ""
        }`,
        reference_type: "user",
        reference_id: tip.id
      });

      return tip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tips"] });
      setShowTipModal(false);
      setTipAmount(5);
      setTipMessage("");
      
      // Success haptic
      if (window.NativeAppBridge?.triggerHaptic) {
        window.NativeAppBridge.triggerHaptic('success');
      }
      
      const event = new CustomEvent('showToast', {
        detail: { message: `✨ Tip sent successfully to ${creatorName || creatorEmail}!`, type: 'success' }
      });
      window.dispatchEvent(event);
    },
    onError: (error) => {
      // Error haptic
      if (window.NativeAppBridge?.triggerHaptic) {
        window.NativeAppBridge.triggerHaptic('error');
      }
      
      const event = new CustomEvent('showToast', {
        detail: { message: 'Failed to send tip: ' + error.message, type: 'error' }
      });
      window.dispatchEvent(event);
    }
  });

  const handleSendTip = () => {
    if (!currentUser) {
      const event = new CustomEvent('showToast', {
        detail: { message: 'Please log in to send tips', type: 'error' }
      });
      window.dispatchEvent(event);
      return;
    }

    if (tipAmount <= 0) {
      const event = new CustomEvent('showToast', {
        detail: { message: 'Please enter a valid tip amount', type: 'error' }
      });
      window.dispatchEvent(event);
      return;
    }

    // Haptic feedback
    if (window.NativeAppBridge?.triggerHaptic) {
      window.NativeAppBridge.triggerHaptic('medium');
    }

    const tipData = {
      creator_email: creatorEmail,
      amount_usd: paymentMethod === "usd" ? tipAmount : 0,
      amount_rri: paymentMethod === "soflo" ? tipAmount : 0,
      message: tipMessage,
      content_id: contentId
    };

    tipMutation.mutate(tipData);
  };

  return (
    <>
      <Button
        onClick={() => {
          if (window.NativeAppBridge?.triggerHaptic) {
            window.NativeAppBridge.triggerHaptic('light');
          }
          setShowTipModal(true);
        }}
        variant={variant}
        size={size}
        className="gap-2 min-h-[44px]"
      >
        <Heart className="w-4 h-4" />
        {showAmount && <span>Tip</span>}
      </Button>

      <AnimatePresence>
        {showTipModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowTipModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gradient-to-br from-purple-900/90 to-pink-900/90 rounded-3xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white fill-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Send a Tip</h3>
                    <p className="text-gray-300 text-sm">to {creatorName || creatorEmail}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTipModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Quick Amount Buttons */}
              <div className="mb-6">
                <label className="text-white text-sm font-medium mb-3 block">
                  Quick Amount
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTipAmount(amount)}
                      className={`py-3 px-4 rounded-xl font-bold transition ${
                        tipAmount === amount
                          ? "bg-yellow-500 text-gray-900"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div className="mb-6">
                <label className="text-white text-sm font-medium mb-2 block">
                  Custom Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="number"
                    min="1"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(Number(e.target.value))}
                    className="pl-10 bg-white/10 border-white/20 text-white text-xl font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <label className="text-white text-sm font-medium mb-2 block">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod("usd")}
                    className={`p-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
                      paymentMethod === "usd"
                        ? "bg-green-500 text-white"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    USD
                  </button>
                  <button
                    onClick={() => setPaymentMethod("soflo")}
                    className={`p-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
                      paymentMethod === "soflo"
                        ? "bg-purple-500 text-white"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    SoFloCoin
                  </button>
                </div>
              </div>

              {/* Message */}
              <div className="mb-6">
                <label className="text-white text-sm font-medium mb-2 block">
                  Add a Message (Optional)
                </label>
                <textarea
                  value={tipMessage}
                  onChange={(e) => setTipMessage(e.target.value)}
                  placeholder="Say something nice..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Send Button */}
              <Button
                onClick={handleSendTip}
                disabled={tipMutation.isLoading || tipAmount <= 0}
                className="w-full py-6 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-900 font-bold text-lg rounded-xl min-h-[44px]"
              >
                {tipMutation.isLoading ? "Sending..." : `Send $${tipAmount} Tip`}
              </Button>

              <p className="text-center text-gray-400 text-xs mt-4">
                100% of your tip goes directly to the creator
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
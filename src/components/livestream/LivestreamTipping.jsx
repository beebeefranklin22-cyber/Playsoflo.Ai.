import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Gift, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const quickAmounts = [5, 10, 25, 50, 100];

export default function LivestreamTipping({ streamId, creatorEmail, currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const tipMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.TipTransaction.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      toast.success('🎉 Tip sent! The creator will appreciate your support!');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to send tip: ' + error.message);
    }
  });

  const handleTip = () => {
    const tipAmount = parseFloat(amount);
    if (!tipAmount || tipAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    tipMutation.mutate({
      creator_email: creatorEmail,
      amount_usd: tipAmount,
      amount_rri: 0,
      message: message.trim() || "Enjoying the livestream! 🎉",
      content_id: streamId
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-gradient-to-br from-purple-900 to-pink-900 rounded-3xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Gift className="w-6 h-6 text-yellow-400" />
              Send a Gift
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Quick Amounts */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Quick Amount
              </label>
              <div className="grid grid-cols-5 gap-2">
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    onClick={() => setAmount(amt.toString())}
                    className={`${
                      amount === amt.toString()
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    ${amt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Custom Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Add a Message (Optional)
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say something nice..."
                className="bg-white/10 border-white/20 text-white placeholder-gray-400 min-h-20"
              />
            </div>

            {/* Preview */}
            {amount && parseFloat(amount) > 0 && (
              <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm">You're sending:</span>
                  <span className="text-white font-bold text-xl">${parseFloat(amount).toFixed(2)}</span>
                </div>
                <p className="text-gray-400 text-xs">
                  This will be shown to all viewers with your message!
                </p>
              </div>
            )}

            {/* Send Button */}
            <Button
              onClick={handleTip}
              disabled={!amount || parseFloat(amount) <= 0 || tipMutation.isPending}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-6 text-lg"
            >
              {tipMutation.isPending ? (
                'Sending...'
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Send Gift
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
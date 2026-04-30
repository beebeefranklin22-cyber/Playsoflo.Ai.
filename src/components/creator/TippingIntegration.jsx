import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Gift, Heart, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { secureBalanceUpdate } from "@/functions/secureBalanceUpdate";

export default function TippingIntegration({ creatorEmail, contentId, currentUser, variant = "button" }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState(5);
  const [message, setMessage] = useState("");

  // Fetch sender's current wallet balance
  const { data: senderUser } = useQuery({
    queryKey: ["wallet-balance", currentUser?.email],
    queryFn: () => base44.auth.me(),
    enabled: !!currentUser && showModal,
  });

  const senderBalance = senderUser?.wallet_balance || 0;

  const tipMutation = useMutation({
    mutationFn: async (data) => {
      if (!currentUser) throw new Error("Must be logged in to tip");
      if (senderBalance < data.amount_usd) throw new Error("Insufficient wallet balance");

      // 1. Deduct from sender's wallet
      await secureBalanceUpdate({
        user_email: currentUser.email,
        amount: -data.amount_usd,
        transaction_type: "tip_sent",
        reference_id: contentId,
        description: `Tip to ${creatorEmail}`
      });

      // 2. Credit creator's wallet
      await secureBalanceUpdate({
        user_email: creatorEmail,
        amount: data.amount_usd,
        transaction_type: "tip_received",
        reference_id: contentId,
        description: `Tip from ${currentUser.full_name || currentUser.email}`
      });

      // 3. Record the transaction
      const tip = await base44.entities.TipTransaction.create({
        ...data,
        from_email: currentUser.email,
        from_name: currentUser.full_name || currentUser.email,
        creator_email: creatorEmail,
        content_id: contentId,
        status: "completed"
      });

      // 4. Notify the creator
      await base44.entities.Notification.create({
        recipient_email: creatorEmail,
        type: "tip_received",
        title: `${currentUser.full_name || "Someone"} sent you a $${data.amount_usd} tip!`,
        message: data.message || "No message",
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        reference_id: tip.id,
        reference_type: "tip",
        read: false,
      }).catch(() => {});

      return tip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      queryClient.invalidateQueries({ queryKey: ['my-tips'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      setShowModal(false);
      setAmount(5);
      setMessage("");
      toast.success('Tip sent! 🎉');
    },
    onError: (e) => toast.error(e.message || "Failed to send tip")
  });

  const quickAmounts = [5, 10, 25, 50];

  if (variant === "button") {
    return (
      <>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
        >
          <Gift className="w-4 h-4 mr-2" />
          Send Tip
        </Button>

        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md"
              >
                <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-white/20 p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Gift className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">Send a Tip</h2>
                    <p className="text-gray-400 text-sm">Support {creatorEmail}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      {quickAmounts.map(amt => (
                        <button
                          key={amt}
                          onClick={() => setAmount(amt)}
                          className={`p-3 rounded-lg font-bold transition ${
                            amount === amt
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                              : 'bg-white/10 text-gray-300 hover:bg-white/20'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>

                    <Input
                      type="number"
                      placeholder="Custom amount"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="bg-white/10 border-white/20 text-white text-center text-xl font-bold"
                    />

                    <Input
                      placeholder="Add a message (optional)"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />

                    <div className="p-3 bg-white/5 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Tip Amount</span>
                        <span className="text-white font-bold">${amount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Your Wallet Balance</span>
                        <span className={`font-bold text-sm ${senderBalance >= amount ? "text-green-400" : "text-red-400"}`}>
                          ${senderBalance.toFixed(2)}
                        </span>
                      </div>
                      {senderBalance < amount && (
                        <div className="flex items-center gap-1 text-red-400 text-xs mt-1">
                          <AlertCircle className="w-3 h-3" />
                          Insufficient balance. Add funds in your Wallet.
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => tipMutation.mutate({ amount_usd: amount, message })}
                      disabled={!amount || amount < 1 || senderBalance < amount || tipMutation.isPending}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 disabled:opacity-50"
                    >
                      <Heart className="w-5 h-5 mr-2" />
                      {tipMutation.isPending ? "Sending..." : `Send $${amount} Tip`}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Floating widget variant for VODs
  return (
    <button
      onClick={() => setShowModal(true)}
      className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
    >
      <Gift className="w-6 h-6 text-white" />
    </button>
  );
}
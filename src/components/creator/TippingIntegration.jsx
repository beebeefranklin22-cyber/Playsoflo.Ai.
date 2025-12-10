import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Gift, DollarSign, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function TippingIntegration({ creatorEmail, contentId, currentUser, variant = "button" }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState(5);
  const [message, setMessage] = useState("");

  const tipMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.TipTransaction.create({
        ...data,
        from_email: currentUser.email,
        from_name: currentUser.full_name || currentUser.email,
        creator_email: creatorEmail,
        content_id: contentId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      setShowModal(false);
      setAmount(5);
      setMessage("");
      toast.success('Tip sent! 🎉');
    }
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

                    <div className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-400 text-sm">Tip Amount</span>
                        <span className="text-white font-bold">${amount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Processing Fee</span>
                        <span className="text-gray-400">$0.00</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => tipMutation.mutate({ amount_usd: amount, message })}
                      disabled={!amount || amount < 1}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3"
                    >
                      <Heart className="w-5 h-5 mr-2" />
                      Send ${amount} Tip
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
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Heart, Star, Zap, DollarSign, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const quickTips = [
  { amount: 2, label: "$2", icon: Heart, color: "from-pink-500 to-red-500" },
  { amount: 5, label: "$5", icon: Star, color: "from-yellow-500 to-orange-500" },
  { amount: 10, label: "$10", icon: Gift, color: "from-purple-500 to-pink-500" },
  { amount: 25, label: "$25", icon: Zap, color: "from-blue-500 to-cyan-500" },
];

export default function LiveTippingOverlay({ streamId, creatorEmail, currentUser }) {
  const queryClient = useQueryClient();
  const [showTipModal, setShowTipModal] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [recentTips, setRecentTips] = useState([]);

  // Subscribe to new tips in real-time
  useEffect(() => {
    if (!streamId) return;

    const unsubscribe = base44.entities.TipTransaction.subscribe((event) => {
      if (event.type === 'create' && event.data?.content_id === streamId) {
        // Show tip animation
        setRecentTips(prev => [{
          id: event.data.id,
          amount: event.data.amount_usd,
          message: event.data.message,
          tipper: event.data.tipper_name || 'Anonymous'
        }, ...prev.slice(0, 4)]);
        
        // Remove after animation
        setTimeout(() => {
          setRecentTips(prev => prev.filter(t => t.id !== event.data.id));
        }, 5000);
      }
    });

    return () => unsubscribe();
  }, [streamId]);

  const sendTipMutation = useMutation({
    mutationFn: async (amount) => {
      return await base44.entities.TipTransaction.create({
        creator_email: creatorEmail,
        tipper_email: currentUser.email,
        tipper_name: currentUser.full_name,
        amount_usd: amount,
        amount_rri: 0,
        message: message.trim() || `Sent $${amount} during livestream!`,
        content_id: streamId,
        is_livestream_tip: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      toast.success('🎉 Tip sent!');
      setShowTipModal(false);
      setCustomAmount("");
      setMessage("");
    }
  });

  const handleQuickTip = (amount) => {
    sendTipMutation.mutate(amount);
  };

  return (
    <>
      {/* Quick Tip Buttons - Always Visible */}
      <div className="flex items-center gap-2">
        {quickTips.map((tip) => (
          <Button
            key={tip.amount}
            onClick={() => handleQuickTip(tip.amount)}
            disabled={sendTipMutation.isPending || !currentUser}
            size="sm"
            className={`bg-gradient-to-r ${tip.color} hover:scale-110 transition-transform`}
          >
            <tip.icon className="w-4 h-4 mr-1" />
            {tip.label}
          </Button>
        ))}
        <Button
          onClick={() => setShowTipModal(true)}
          disabled={!currentUser}
          size="sm"
          className="bg-white/10 hover:bg-white/20 border border-white/20"
        >
          <DollarSign className="w-4 h-4 mr-1" />
          Custom
        </Button>
      </div>

      {/* Floating Tip Animations */}
      <div className="fixed top-20 right-6 z-30 pointer-events-none space-y-2">
        <AnimatePresence>
          {recentTips.map((tip) => (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.8 }}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full shadow-2xl"
            >
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                <span className="font-bold">{tip.tipper}</span>
                <span>sent ${tip.amount}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Custom Tip Modal */}
      <AnimatePresence>
        {showTipModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowTipModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gradient-to-br from-purple-900 to-pink-900 rounded-3xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Send a Tip</h3>
                <button onClick={() => setShowTipModal(false)}>
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm mb-2 block">Amount (USD)</label>
                  <Input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="bg-white/10 border-white/20 text-white text-lg"
                  />
                </div>

                <div>
                  <label className="text-white text-sm mb-2 block">Message (Optional)</label>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Say something nice..."
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <Button
                  onClick={() => {
                    const amount = parseFloat(customAmount);
                    if (!amount || amount <= 0) {
                      toast.error('Please enter a valid amount');
                      return;
                    }
                    sendTipMutation.mutate(amount);
                  }}
                  disabled={!customAmount || sendTipMutation.isPending}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 py-6 text-lg font-bold"
                >
                  {sendTipMutation.isPending ? 'Sending...' : `Send $${customAmount || '0'} Tip`}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
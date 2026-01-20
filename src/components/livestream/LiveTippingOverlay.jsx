import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Gift, Heart, Star, Zap, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import QuickPaymentModal from "./QuickPaymentModal";

const quickTips = [
  { amount: 5, label: "$5", icon: Heart, color: "from-pink-500 to-red-500" },
  { amount: 10, label: "$10", icon: Star, color: "from-yellow-500 to-orange-500" },
  { amount: 25, label: "$25", icon: Gift, color: "from-purple-500 to-pink-500" },
  { amount: 50, label: "$50", icon: Zap, color: "from-blue-500 to-cyan-500" },
];

export default function LiveTippingOverlay({ streamId, creatorEmail, currentUser }) {
  const queryClient = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
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
          tipper: event.data.tipper_username || event.data.tipper_name || 'Anonymous'
        }, ...prev.slice(0, 4)]);
        
        // Remove after animation
        setTimeout(() => {
          setRecentTips(prev => prev.filter(t => t.id !== event.data.id));
        }, 5000);
      }
    });

    return () => unsubscribe();
  }, [streamId]);

  return (
    <>
      {/* Quick Tip Buttons - Always Visible */}
      <div className="flex items-center gap-2">
        {quickTips.map((tip) => (
          <Button
            key={tip.amount}
            onClick={() => {
              setSelectedAmount(tip.amount);
              setShowPaymentModal(true);
            }}
            disabled={!currentUser}
            size="sm"
            className={`bg-gradient-to-r ${tip.color} hover:scale-110 transition-transform`}
          >
            <tip.icon className="w-4 h-4 mr-1" />
            {tip.label}
          </Button>
        ))}
        <Button
          onClick={() => {
            setSelectedAmount(null);
            setShowPaymentModal(true);
          }}
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

      {/* Quick Payment Modal */}
      <QuickPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedAmount(null);
        }}
        type="tip"
        amount={selectedAmount}
        creatorEmail={creatorEmail}
        streamId={streamId}
        currentUser={currentUser}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tips'] });
        }}
      />
    </>
  );
}
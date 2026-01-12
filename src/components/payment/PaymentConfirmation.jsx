import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, DollarSign, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentConfirmation({ 
  amount, 
  currency = "USD", 
  recipient, 
  type = "transfer",
  onClose 
}) {
  useEffect(() => {
    // Play success sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzSO0fPTfzEGH27C7+OZSA0PVK3n56RSFAk+muH0xHIkBjGJ0PPSgjQGJ3nJ8OGXQwsRX7To7KVSEwk9l9/zwW8fBjaO0fPRgy8FJHbH8N2PPQYUZK7o6KdUEgk/md3zw3IkBjKJ0fPSgjQGJ3nJ8OGXQwsRX7To7KVSEwk9l9/zwW8fBjaO0fPRgy8FJHbH8N2PPQYUZK7o6KdUEgk/md3zw3IkBjKJ0fPSgjQGJ3nJ8OGXQwsRX7To7KVSEwk9l9/zwW8fBjaO0fPRgy8FJHbH8N2PPQYUZK7o6KdUEgk/md3zw3IkBjKJ0fPSgjQGJ3nJ8OGXQwsRX7To7KVSEwk9l9/zwW8fBjaO0fPRgy8FJHbH8N2PPQYUZK7o6KdUEgk/md3zw3IkBjKJ0fPSgjQGJ3nJ8OGXQw==');
    audio.play().catch(() => {}); // Ignore if autoplay is blocked
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-center border border-white/10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-12 h-12 text-white" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Payment Successful!
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4 my-6"
        >
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Amount</span>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-white font-bold text-xl">
                  {typeof amount === 'number' ? amount.toFixed(2) : amount} {currency}
                </span>
              </div>
            </div>
          </div>

          {recipient && (
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Recipient</span>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium">{recipient}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Time</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-white font-medium">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-400 text-sm mb-6"
        >
          {type === "transfer" && "Money has been transferred successfully"}
          {type === "booking" && "Booking confirmed and payment processed"}
          {type === "order" && "Order placed and payment received"}
          {type === "purchase" && "Purchase completed successfully"}
        </motion.p>

        <Button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-6"
        >
          Done
        </Button>
      </motion.div>
    </motion.div>
  );
}
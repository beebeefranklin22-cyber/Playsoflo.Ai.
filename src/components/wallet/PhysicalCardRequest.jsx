import React from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// This used to collect a shipping address and "submit" a request for a
// paid Premium/Elite card ($9.99/$29.99) that was never actually charged,
// with no card-issuing integration (e.g. Stripe Issuing) anywhere in the
// codebase to ever fulfill it even if it had been. A real physical card
// program needs that kind of partner integration first, so this is now an
// honest "coming soon" rather than a form that collects real shipping
// details for a card that will never arrive.
export default function PhysicalCardRequest({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-gray-900 rounded-3xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <CreditCard className="w-7 h-7 text-purple-400" />
              Physical Card
            </h2>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="text-center space-y-4">
            <Clock className="w-12 h-12 text-purple-400 mx-auto" />
            <h3 className="text-xl font-bold text-white">Coming Soon</h3>
            <p className="text-gray-400 text-sm">
              A physical PlaySoFlo debit card linked to your wallet is on the way. We'll let you know as soon as it's ready to request.
            </p>
            <Button onClick={onClose} className="w-full bg-purple-600 hover:bg-purple-700">
              Got it
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

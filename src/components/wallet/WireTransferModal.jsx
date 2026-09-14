import React from "react";
import { Button } from "@/components/ui/button";
import { X, Building2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Previously this form collected real bank account/routing details and
// "initiated" a transfer that only ever inserted a pending database row --
// no wallet debit, no bank/Stripe API call, and a success message telling
// the user money was moving when it never had been. Wire transfers need a
// real banking-rails partner integration (e.g. Stripe Treasury/Wise) this
// app isn't wired up to yet, so this is now an honest "coming soon" rather
// than a form that pretends to work.
export default function WireTransferModal({ onClose }) {
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
          className="w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Wire Transfer</h2>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 text-center space-y-4">
            <Clock className="w-12 h-12 text-indigo-400 mx-auto" />
            <h3 className="text-xl font-bold text-white">Coming Soon</h3>
            <p className="text-gray-400 text-sm">
              Direct bank wire transfers aren't available yet. In the meantime, use Withdraw to send money to a linked bank account.
            </p>
            <Button onClick={onClose} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600">
              Got it
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

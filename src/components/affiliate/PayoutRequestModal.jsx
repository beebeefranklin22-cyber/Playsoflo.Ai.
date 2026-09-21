import React from "react";
import { Button } from "@/components/ui/button";
import { X, DollarSign, Wallet, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// This used to call base44.functions.invoke('processAffiliatePayout', ...),
// a backend function that was never implemented -- but there was never
// really a "payout" to process. creditAffiliateCommission (see
// api/_lib/orderHelpers.js) already credits the referrer's real wallet
// balance the instant a referred purchase completes, which is exactly what
// this page's own copy says ("commission instantly credited to your
// wallet!"). Asking the user to separately "request a payout" of money
// that's already sitting in their spendable balance was the actual bug --
// there's nothing to move. The real cash-out step (to a bank account) is
// the wallet's own withdraw flow, so this just points there.
export default function PayoutRequestModal({ isOpen, onClose, pendingEarnings }) {
  const navigate = useNavigate();
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
          className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-green-400" />
              Your Commissions
            </h2>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-5 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-white text-3xl font-bold mb-1">${pendingEarnings.toFixed(2)}</p>
              <p className="text-gray-400 text-sm">already in your wallet</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-start gap-3">
              <Wallet className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-gray-300 text-sm">
                Referral commissions are credited to your wallet the instant someone completes a purchase using your link -- there's no separate payout step. Withdraw to your bank account any time from your Wallet.
              </p>
            </div>

            <Button
              onClick={() => navigate(createPageUrl('Wallet'))}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 py-6 text-lg"
            >
              Go to Wallet
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

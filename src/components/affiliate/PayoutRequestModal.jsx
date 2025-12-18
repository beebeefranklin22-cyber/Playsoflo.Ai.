import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, DollarSign, Wallet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function PayoutRequestModal({ isOpen, onClose, pendingEarnings, currentUser }) {
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePayout = async () => {
    const payoutAmount = parseFloat(amount);
    
    if (!payoutAmount || payoutAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (payoutAmount > pendingEarnings) {
      toast.error('Amount exceeds pending earnings');
      return;
    }

    if (payoutAmount < 25) {
      toast.error('Minimum payout is $25');
      return;
    }

    setProcessing(true);
    try {
      const { data } = await base44.functions.invoke('processAffiliatePayout', {
        payout_amount: payoutAmount,
        payout_method: 'wallet'
      });

      setSuccess(true);
      toast.success('Payout successful!');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Payout error:', error);
      toast.error(error.message || 'Payout failed');
      setProcessing(false);
    }
  };

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
              Request Payout
            </h2>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {!success ? (
            <div className="space-y-6">
              {/* Available Balance */}
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-5">
                <p className="text-gray-400 text-sm mb-1">Available to Withdraw</p>
                <p className="text-white text-3xl font-bold">${pendingEarnings.toFixed(2)}</p>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-white font-semibold mb-3 block">Payout Amount</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-white/10 border-white/20 text-white text-2xl text-center"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setAmount((pendingEarnings * 0.25).toFixed(2))}
                    className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setAmount((pendingEarnings * 0.5).toFixed(2))}
                    className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setAmount((pendingEarnings * 0.75).toFixed(2))}
                    className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20"
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setAmount(pendingEarnings.toFixed(2))}
                    className="flex-1 px-3 py-2 bg-purple-600 rounded-lg text-white text-sm hover:bg-purple-700"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Payout Method */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-white font-semibold">PlaySoFlo Wallet</p>
                    <p className="text-gray-400 text-sm">Instant transfer • No fees</p>
                  </div>
                </div>
              </div>

              {/* Minimum Notice */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-300 text-xs">
                    Minimum payout: $25 • Funds added instantly to your wallet
                  </p>
                </div>
              </div>

              <Button
                onClick={handlePayout}
                disabled={processing || !amount || parseFloat(amount) < 25}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 py-6 text-lg"
              >
                {processing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  'Request Payout'
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Payout Complete!</h3>
              <p className="text-gray-300 mb-6">
                ${parseFloat(amount).toFixed(2)} has been added to your wallet
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full bg-green-600 hover:bg-green-700"
              >
                View Wallet
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
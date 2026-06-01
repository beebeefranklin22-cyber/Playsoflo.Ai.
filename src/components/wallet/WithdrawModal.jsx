import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Download, Building, Zap, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { processWithdrawal } from "@/functions/processWithdrawal";
import { toast } from "sonner";
import CheckoutPaymentSelector from "@/components/payment/CheckoutPaymentSelector";

export default function WithdrawModal({ currentUser, onClose }) {
  const [amount, setAmount] = useState("");
  const [speed, setSpeed] = useState("standard");
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [loading, setLoading] = useState(false);

  const queryClient = useQueryClient();
  const availableBalance = currentUser?.usd_balance || 0;

  const getFeeAmount = () => (speed === "instant" ? 0.50 : 0);
  const getTotalAmount = () => parseFloat(amount || 0) + getFeeAmount();

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!selectedMethodId) {
      toast.error('Please select a payout destination.');
      return;
    }
    const totalWithFees = getTotalAmount();
    if (totalWithFees > availableBalance) {
      toast.error(`Insufficient balance. You need $${totalWithFees.toFixed(2)} (includes fees)`);
      return;
    }

    setLoading(true);
    try {
      const { data } = await processWithdrawal({
        amount: parseFloat(amount),
        method: speed === "instant" ? "instant" : "bank",
        payment_method_id: selectedMethodId
      });

      if (!data.success) {
        toast.error(data.error || "Withdrawal failed");
        setLoading(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      toast.success(`Withdrawal of $${amount} initiated. ${speed === "instant" ? "Funds arrive within minutes." : "Funds arrive in 1-3 business days."}`);
      onClose();
    } catch (err) {
      console.error("Withdrawal failed:", err);
      toast.error("Failed to process withdrawal: " + (err?.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

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
          className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Withdraw Funds</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Available Balance</p>
              <p className="text-white text-3xl font-bold">${availableBalance.toFixed(2)}</p>
            </div>

            <div>
              <label className="text-white font-semibold mb-3 block">Amount to Withdraw</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                max={availableBalance}
                className="bg-white/10 border-white/20 text-white text-2xl"
              />
              <button
                onClick={() => setAmount(availableBalance.toString())}
                className="text-blue-400 text-sm mt-2 hover:underline"
              >
                Withdraw all
              </button>
            </div>

            {/* Destination — saved payout methods */}
            <div>
              <label className="text-white font-semibold mb-3 block">Withdraw To</label>
              <CheckoutPaymentSelector
                currentUser={currentUser}
                value={selectedMethodId}
                onChange={setSelectedMethodId}
                compact
              />
            </div>

            {/* Speed */}
            <div>
              <label className="text-white font-semibold mb-3 block">Speed</label>
              <div className="space-y-3">
                <button
                  onClick={() => setSpeed("standard")}
                  className={`w-full p-4 rounded-xl border-2 transition ${speed === "standard" ? "border-blue-500 bg-blue-500/10" : "border-white/20 bg-white/5"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building className="w-6 h-6 text-white" />
                      <div className="text-left">
                        <p className="text-white font-semibold">Standard</p>
                        <p className="text-gray-400 text-sm">1-3 business days</p>
                      </div>
                    </div>
                    <p className="text-green-400 text-sm">Free</p>
                  </div>
                </button>

                <button
                  onClick={() => setSpeed("instant")}
                  className={`w-full p-4 rounded-xl border-2 transition ${speed === "instant" ? "border-blue-500 bg-blue-500/10" : "border-white/20 bg-white/5"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="w-6 h-6 text-yellow-400" />
                      <div className="text-left">
                        <p className="text-white font-semibold">Instant</p>
                        <p className="text-gray-400 text-sm">Arrives in minutes</p>
                      </div>
                    </div>
                    <p className="text-yellow-400 text-sm">$0.50 fee</p>
                  </div>
                </button>
              </div>
            </div>

            {amount && parseFloat(amount) > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Withdrawal Amount</span>
                  <span className="text-white">${parseFloat(amount).toFixed(2)}</span>
                </div>
                {getFeeAmount() > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Processing Fee</span>
                    <span className="text-yellow-400">${getFeeAmount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-2 border-t border-white/10">
                  <span className="text-white">Total Deducted</span>
                  <span className="text-white">${getTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleWithdraw}
              disabled={loading || !amount || parseFloat(amount) <= 0 || !selectedMethodId}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 py-6 text-lg"
            >
              <Download className="w-5 h-5 mr-2" />
              {loading ? "Processing..." : amount && parseFloat(amount) > 0 ? `Withdraw $${getTotalAmount().toFixed(2)}` : "Withdraw"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
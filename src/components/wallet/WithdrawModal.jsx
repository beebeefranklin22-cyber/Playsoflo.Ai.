import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Download, Building, CreditCard, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function WithdrawModal({ currentUser, onClose }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [loading, setLoading] = useState(false);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', currentUser.email],
    queryFn: async () => {
      return await base44.entities.BankAccount.filter({
        user_email: currentUser.email,
        is_verified: true
      });
    },
    initialData: []
  });

  const availableBalance = currentUser?.usd_balance || 0;

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (parseFloat(amount) > availableBalance) {
      alert("Insufficient balance");
      return;
    }

    if (method === "bank" && bankAccounts.length === 0) {
      alert("Please add a bank account first");
      return;
    }

    setLoading(true);
    try {
      // Create payout record
      await base44.entities.Payment.create({
        amount_usd: parseFloat(amount),
        amount_rri: 0,
        method: method === "instant" ? "instant_payout" : "bank_transfer",
        status: "pending",
        reference_type: "withdrawal",
        memo: `Withdraw to ${method}`
      });

      // Update user balance
      await base44.auth.updateMe({
        usd_balance: availableBalance - parseFloat(amount)
      });

      alert(`Withdrawal of $${amount} initiated. ${
        method === "instant" 
          ? "Funds will arrive within minutes." 
          : "Funds will arrive in 1-3 business days."
      }`);
      
      onClose();
    } catch (err) {
      console.error("Withdrawal failed:", err);
      alert("Failed to process withdrawal: " + err.message);
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
          className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Withdraw Funds</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Available Balance</p>
              <p className="text-white text-3xl font-bold">
                ${availableBalance.toFixed(2)}
              </p>
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

            <div>
              <label className="text-white font-semibold mb-3 block">Withdrawal Method</label>
              <div className="space-y-3">
                <button
                  onClick={() => setMethod("instant")}
                  className={`w-full p-4 rounded-xl border-2 transition ${
                    method === "instant"
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-white/20 bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="w-6 h-6 text-yellow-400" />
                      <div className="text-left">
                        <p className="text-white font-semibold">Instant Payout</p>
                        <p className="text-gray-400 text-sm">Arrives in minutes</p>
                      </div>
                    </div>
                    <p className="text-yellow-400 text-sm">$0.50 fee</p>
                  </div>
                </button>

                <button
                  onClick={() => setMethod("bank")}
                  className={`w-full p-4 rounded-xl border-2 transition ${
                    method === "bank"
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-white/20 bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building className="w-6 h-6 text-white" />
                      <div className="text-left">
                        <p className="text-white font-semibold">Bank Transfer</p>
                        <p className="text-gray-400 text-sm">1-3 business days</p>
                      </div>
                    </div>
                    <p className="text-green-400 text-sm">Free</p>
                  </div>
                </button>

                <button
                  onClick={() => setMethod("card")}
                  className={`w-full p-4 rounded-xl border-2 transition ${
                    method === "card"
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-white/20 bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-6 h-6 text-white" />
                      <div className="text-left">
                        <p className="text-white font-semibold">Debit Card</p>
                        <p className="text-gray-400 text-sm">Within 30 minutes</p>
                      </div>
                    </div>
                    <p className="text-blue-400 text-sm">1% fee</p>
                  </div>
                </button>
              </div>
            </div>

            {method === "bank" && bankAccounts.length === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <p className="text-yellow-300 text-sm">
                  You need to add a verified bank account first
                </p>
              </div>
            )}

            <Button
              onClick={handleWithdraw}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 py-6 text-lg"
            >
              <Download className="w-5 h-5 mr-2" />
              {loading ? "Processing..." : `Withdraw $${amount || "0.00"}`}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
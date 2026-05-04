import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Download, Building, CreditCard, Zap, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureBalanceUpdate } from "@/functions/secureBalanceUpdate";
import { toast } from "sonner";

export default function WithdrawModal({ currentUser, onClose }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("instant");
  const [loading, setLoading] = useState(false);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', currentUser.email],
    queryFn: () => base44.entities.BankAccount.filter({ user_email: currentUser.email, is_verified: true }),
    initialData: []
  });

  const { data: paymentCards = [] } = useQuery({
    queryKey: ['payment-cards', currentUser.email],
    queryFn: () => base44.entities.PaymentCard.filter({ user_email: currentUser.email }),
    initialData: []
  });

  const queryClient = useQueryClient();
  const availableBalance = currentUser?.usd_balance || 0;

  const getFeeAmount = () => {
    if (method === "instant") return 0.50;
    if (method === "card") {
      const stripeFee = parseFloat(amount) * 0.01;
      return stripeFee + 0.50;
    }
    return 0;
  };

  const getTotalAmount = () => {
    return parseFloat(amount || 0) + getFeeAmount();
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const totalWithFees = getTotalAmount();
    if (totalWithFees > availableBalance) {
      toast.error(`Insufficient balance. You need $${totalWithFees.toFixed(2)} (includes fees)`);
      return;
    }

    if (method === "bank" && bankAccounts.length === 0) {
      toast.error("Please add a verified bank account first to use Bank Transfer.");
      return;
    }

    if ((method === "instant" || method === "card") && paymentCards.length === 0) {
      toast.error("Please add a debit card first to use this withdrawal method.");
      return;
    }

    setLoading(true);
    try {
      const feeAmount = getFeeAmount();
      
      // Use secure backend function to deduct balance
      const { data } = await secureBalanceUpdate({
        operation: 'subtract',
        amount: totalWithFees,
        reference_type: 'withdrawal',
        memo: `Withdraw to ${method} (Fee: $${feeAmount.toFixed(2)})`
      });

      if (!data.success) {
        toast.error(data.error || "Withdrawal failed");
        setLoading(false);
        return;
      }

      await base44.entities.Notification.create({
        recipient_email: currentUser.email,
        type: "payment_received",
        title: "Withdrawal Initiated",
        message: `Your withdrawal of $${parseFloat(amount).toFixed(2)} is being processed. Fee: $${feeAmount.toFixed(2)}`,
        read: false,
        action_url: "/Wallet"
      });

      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      toast.success(`Withdrawal of $${amount} initiated. ${
        method === "instant" 
          ? "Funds arrive within minutes." 
          : method === "card"
          ? "Funds arrive within 30 minutes."
          : "Funds arrive in 1-3 business days."
      }`);
      
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
                    <p className="text-blue-400 text-sm">1% + $0.50 fee</p>
                  </div>
                </button>
              </div>
            </div>

            {method === "bank" && bankAccounts.length === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-300 text-sm">No verified bank account linked. Add one under <strong>Banks</strong> in the Wallet to use this method.</p>
              </div>
            )}

            {(method === "instant" || method === "card") && paymentCards.length === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-300 text-sm">No debit card linked. Add one under <strong>Cards</strong> in the Wallet to use this method.</p>
              </div>
            )}

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
              disabled={loading || !amount || parseFloat(amount) <= 0}
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
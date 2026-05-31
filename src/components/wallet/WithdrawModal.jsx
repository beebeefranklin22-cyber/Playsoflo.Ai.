import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Download, Building, CreditCard, Zap, AlertCircle, Wallet, Bitcoin, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { processWithdrawal } from "@/functions/processWithdrawal";
import { toast } from "sonner";

const getMethodIcon = (type) => {
  switch (type) {
    case 'card': return CreditCard;
    case 'bank_account': return Building;
    case 'crypto_wallet': return Bitcoin;
    default: return Wallet;
  }
};

const getMethodLabel = (m) => {
  if (m.type === 'card' && m.card_details) return `${m.card_details.brand || 'Card'} •••• ${m.card_details.last4}`;
  if (m.type === 'bank_account' && m.bank_details) return `${m.bank_details.bank_name || 'Bank'} •••• ${m.bank_details.last4}`;
  if (m.crypto_details) return `Crypto •••• ${m.crypto_details.wallet_address?.slice(-4)}`;
  if (m.external_details) return `${m.type} (${m.external_details.username || m.external_details.email})`;
  return m.type?.replace('_', ' ');
};

export default function WithdrawModal({ currentUser, onClose }) {
  const [amount, setAmount] = useState("");
  const [speed, setSpeed] = useState("standard");
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods', currentUser?.email],
    queryFn: async () => {
      const methods = await base44.entities.PaymentMethod.filter({ user_email: currentUser.email, status: 'active' });
      return methods.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
    },
    enabled: !!currentUser,
    initialData: []
  });

  const queryClient = useQueryClient();
  const availableBalance = currentUser?.usd_balance || 0;

  const activeMethodId = selectedMethodId || paymentMethods.find(m => m.is_default)?.id || paymentMethods[0]?.id;

  const getFeeAmount = () => (speed === "instant" ? 0.50 : 0);
  const getTotalAmount = () => parseFloat(amount || 0) + getFeeAmount();

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (paymentMethods.length === 0) {
      toast.error('Add a payout method in "Payment Methods" first.');
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
        payment_method_id: activeMethodId
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
              {paymentMethods.length === 0 ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-300 text-sm">No payout method linked. Add a card, bank, Cash App, Venmo, PayPal or crypto wallet under <strong>Payment Methods</strong> first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {paymentMethods.map((m) => {
                    const Icon = getMethodIcon(m.type);
                    const isActive = activeMethodId === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMethodId(m.id)}
                        className={`w-full p-3 rounded-xl border-2 transition flex items-center justify-between ${
                          isActive ? "border-blue-500 bg-blue-500/10" : "border-white/20 bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-white" />
                          <span className="text-white text-sm capitalize">{getMethodLabel(m)}</span>
                        </div>
                        {isActive && <Check className="w-5 h-5 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
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
              disabled={loading || !amount || parseFloat(amount) <= 0 || paymentMethods.length === 0}
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
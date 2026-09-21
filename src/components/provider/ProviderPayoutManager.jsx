import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, DollarSign, Building, Zap, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { processWithdrawal } from "@/functions/processWithdrawal";
import CheckoutPaymentSelector from "@/components/payment/CheckoutPaymentSelector";
import PaymentMethodsManager from "@/components/wallet/PaymentMethodsManager";

const MIN_PAYOUT = 10;

// This used to call base44.functions.invoke('processProviderPayout', ...),
// a backend function that was never implemented, so every payout request
// failed outright -- providers had no way to actually cash out. It also
// computed its own "available earnings" from raw booking/rental/property
// totals with hardcoded platform-fee percentages, entirely separate from
// the real number.
//
// In fact a provider's earnings are already credited into their real
// wallet balance the moment a booking completes (see the wallet_move
// calls in api/_handlers/car-rental.js and friends), and there's already
// a real, working withdrawal endpoint (/api/wallet, action: withdraw)
// that sends the money out via an actual Stripe Connect transfer + payout
// when the provider has a connected account, exactly like WithdrawModal.jsx
// already uses for general wallet withdrawals. This is that same, real
// flow, just framed for a provider opening it from Provider Hub.
export default function ProviderPayoutManager({ isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [speed, setSpeed] = useState("standard");
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showAddMethod, setShowAddMethod] = useState(false);

  if (!isOpen) return null;

  const availableBalance = currentUser?.usd_balance || currentUser?.balance_usd || 0;
  const feeAmount = speed === "instant" ? 0.5 : 0;

  const handlePayout = async () => {
    const payoutAmount = parseFloat(amount);
    if (!payoutAmount || payoutAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (payoutAmount < MIN_PAYOUT) {
      toast.error(`Minimum payout is $${MIN_PAYOUT}`);
      return;
    }
    if (payoutAmount + feeAmount > availableBalance) {
      toast.error(`Insufficient balance. You need $${(payoutAmount + feeAmount).toFixed(2)} (includes fees)`);
      return;
    }
    if (!selectedMethodId) {
      toast.error('Please select a bank account');
      return;
    }

    setProcessing(true);
    try {
      const { data } = await processWithdrawal({
        amount: payoutAmount,
        method: speed === "instant" ? "instant" : "bank",
        payment_method_id: selectedMethodId,
      });
      if (!data.success) {
        toast.error(data.error || 'Payout failed');
        setProcessing(false);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setSuccess(true);
      toast.success('Payout requested!');
    } catch (err) {
      toast.error('Failed to process payout: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
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
        className="w-full max-w-md bg-gray-900 rounded-3xl p-6 max-h-[90dvh] overflow-y-auto"
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
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-5">
              <p className="text-gray-400 text-sm mb-1">Available Balance</p>
              <p className="text-white text-3xl font-bold">${availableBalance.toFixed(2)}</p>
            </div>

            <div>
              <label className="text-white font-semibold mb-3 block">Payout Amount</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                max={availableBalance}
                className="bg-white/10 border-white/20 text-white text-2xl text-center"
              />
              <div className="flex gap-2 mt-3">
                {[0.25, 0.5, 0.75, 1].map((frac) => (
                  <button
                    key={frac}
                    onClick={() => setAmount((availableBalance * frac).toFixed(2))}
                    className={`flex-1 px-3 py-2 rounded-lg text-white text-sm ${frac === 1 ? 'bg-green-600 hover:bg-green-700' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    {frac === 1 ? 'Max' : `${frac * 100}%`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white font-semibold mb-3 block">Payout To</label>
              <CheckoutPaymentSelector
                currentUser={currentUser}
                value={selectedMethodId}
                onChange={setSelectedMethodId}
                onAddNew={() => setShowAddMethod(true)}
                allowedTypes={["bank_account"]}
                compact
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-3 block">Speed</label>
              <div className="space-y-3">
                <button
                  onClick={() => setSpeed('standard')}
                  className={`w-full p-4 rounded-xl border-2 transition ${speed === 'standard' ? 'border-green-500 bg-green-500/10' : 'border-white/20 bg-white/5'}`}
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
                  onClick={() => setSpeed('instant')}
                  className={`w-full p-4 rounded-xl border-2 transition ${speed === 'instant' ? 'border-green-500 bg-green-500/10' : 'border-white/20 bg-white/5'}`}
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

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-300 text-xs">Minimum payout: ${MIN_PAYOUT}</p>
              </div>
            </div>

            <Button
              onClick={handlePayout}
              disabled={processing || !amount || parseFloat(amount) < MIN_PAYOUT || !selectedMethodId}
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
            <h3 className="text-2xl font-bold text-white mb-3">Payout Requested!</h3>
            <p className="text-gray-300 mb-6">
              ${parseFloat(amount).toFixed(2)} is on its way to your bank account.
              {speed === 'instant' ? ' It should arrive within minutes.' : ' It should arrive in 1-3 business days.'}
            </p>
            <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700">
              Done
            </Button>
          </div>
        )}
      </motion.div>

      {showAddMethod && (
        <PaymentMethodsManager
          currentUser={currentUser}
          onClose={() => {
            setShowAddMethod(false);
            queryClient.invalidateQueries({ queryKey: ['payment-methods', currentUser?.email] });
          }}
        />
      )}
    </motion.div>
  );
}

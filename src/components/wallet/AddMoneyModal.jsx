import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, CreditCard, Building, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StripePaymentForm from "../payment/StripePaymentForm";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AddMoneyModal({ currentUser, onClose }) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);

  const quickAmounts = [50, 100, 250, 500, 1000];

  const handleSuccess = async () => {
    if (!currentUser || isProcessing) {
      return;
    }

    setIsProcessing(true);
    try {
      // Update user balance
      const currentBalance = currentUser.usd_balance || 0;
      await base44.auth.updateMe({
        usd_balance: currentBalance + parseFloat(amount)
      });

      // Create transaction record
      await base44.entities.Payment.create({
        amount_usd: parseFloat(amount),
        amount_rri: 0,
        method: "stripe",
        status: "completed",
        reference_type: "deposit",
        memo: "Added funds to wallet"
      });

      toast.success("Funds added successfully!");
      setStep(3);
    } catch (err) {
      console.error("Failed to update balance:", err);
      toast.error(err?.message || 'Failed to update balance');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Add Money</h2>
            <button 
              onClick={handleClose}
              disabled={isProcessing}
              className="p-2 hover:bg-white/10 rounded-full transition disabled:opacity-50"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

          <div className="p-6">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="text-white font-semibold mb-3 block">Amount to Add</label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-white/10 border-white/20 text-white text-3xl text-center"
                  />
                  <div className="grid grid-cols-5 gap-2 mt-4">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setAmount(amt.toString())}
                        className="px-4 py-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition"
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-white font-semibold mb-3 block">Payment Method</label>
                  <div className="space-y-3">
                    <button
                      onClick={() => setMethod("card")}
                      className={`w-full p-4 rounded-xl border-2 transition ${
                        method === "card"
                          ? "border-green-500 bg-green-500/10"
                          : "border-white/20 bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-white" />
                        <div className="text-left">
                          <p className="text-white font-semibold">Debit/Credit Card</p>
                          <p className="text-gray-400 text-sm">Instant</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setMethod("bank")}
                      className={`w-full p-4 rounded-xl border-2 transition ${
                        method === "bank"
                          ? "border-green-500 bg-green-500/10"
                          : "border-white/20 bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Building className="w-6 h-6 text-white" />
                        <div className="text-left">
                          <p className="text-white font-semibold">Bank Transfer</p>
                          <p className="text-gray-400 text-sm">1-3 business days</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 py-6 text-lg"
                >
                  Continue
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-2">Adding to wallet</p>
                  <p className="text-white text-3xl font-bold">${parseFloat(amount).toFixed(2)}</p>
                </div>

                <StripePaymentForm
                  amount={parseFloat(amount)}
                  referenceType="deposit"
                  referenceId={currentUser.id}
                  description={`Add ${amount} to wallet`}
                  onSuccess={handleSuccess}
                  onError={(error) => {
                    console.error("Payment error:", error);
                    const errorMsg = error?.message || error?.error || (typeof error === 'string' ? error : 'Payment failed. Please try again.');
                    alert("Payment failed: " + errorMsg);
                  }}
                />

                <button
                  onClick={() => setStep(1)}
                  disabled={isProcessing}
                  className="w-full text-gray-400 hover:text-white transition disabled:opacity-50"
                >
                  ← Back
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Plus className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Money Added!</h3>
                <p className="text-gray-300 mb-6">
                  ${amount} has been added to your wallet
                </p>
                <Button onClick={handleClose} className="w-full bg-green-600">
                  Done
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
  );
}
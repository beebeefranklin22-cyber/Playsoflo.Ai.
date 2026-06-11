import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import StripePaymentForm from "../payment/StripePaymentForm";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AddMoneyModal({ currentUser, onClose }) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [method] = useState("card");
  const [paymentError, setPaymentError] = useState(null);
  const queryClient = useQueryClient();

  // Block any navigation while modal is open
  React.useEffect(() => {
    const preventNavigation = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    window.addEventListener('beforeunload', preventNavigation);
    return () => window.removeEventListener('beforeunload', preventNavigation);
  }, []);

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
        <div className="w-full max-w-lg bg-gray-900 rounded-3xl p-6 text-center">
          <p className="text-white text-lg mb-4">Please log in to add money</p>
          <Button onClick={onClose} className="bg-purple-600">Close</Button>
        </div>
      </div>
    );
  }

  // Prevent accidental closes during payment
  const handleModalClose = () => {
    if (step === 2) {
      console.log('⚠️ Prevented close during payment step');
      return;
    }
    onClose();
  };

  const quickAmounts = [50, 100, 250, 500, 1000];

  const handleSuccess = async (paymentIntent) => {
    setStep(3);
    toast.success("Payment successful! Your balance will update shortly.");
    // Poll for balance update (webhook may take a few seconds)
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (attempts >= 6) clearInterval(poll);
    }, 3000);
  };

  const handleClose = () => {
    onClose();
  };

  const handleContinue = () => {
    console.log('=== CONTINUE CLICKED ===');
    console.log('Amount:', amount);
    console.log('Method:', method);
    console.log('Current step:', step);
    
    if (amount && parseFloat(amount) > 0) {
      console.log('✅ Valid amount, moving to step 2');
      setPaymentError(null);
      setStep(2);
    } else {
      console.log('❌ Invalid amount');
      toast.error('Please enter a valid amount');
    }
  };

  return (
      <div 
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl"
        onClick={(e) => {
          if (e.target === e.currentTarget && step !== 2) {
            handleModalClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
          style={{ height: "min(92dvh, 680px)", maxHeight: "92dvh" }}
          onClick={(e) => e.stopPropagation()}
        >
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Add Money - Step {step}</h2>
            {step !== 2 && (
              <button 
                onClick={handleModalClose}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
        </div>

          <div className="p-6 overflow-y-auto flex-1">
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
                    <div className="w-full p-4 rounded-xl border-2 border-green-500 bg-green-500/10">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-white" />
                        <div className="text-left">
                          <p className="text-white font-semibold">Debit/Credit Card</p>
                          <p className="text-gray-400 text-sm">Instant • Stripe secured</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                <Button
                  onClick={handleContinue}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 py-6 text-lg hover:from-green-700 hover:to-emerald-700"
                >
                  Continue
                </Button>
              </div>
            )}

            {step === 2 && method === "card" && (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-2">Adding to wallet</p>
                  <p className="text-white text-3xl font-bold">${parseFloat(amount).toFixed(2)}</p>
                </div>

                {amount && parseFloat(amount) > 0 && (
                  <StripePaymentForm
                    key={`payment-${amount}-${Date.now()}`}
                    amount={parseFloat(amount)}
                    referenceType="deposit"
                    referenceId={currentUser?.id || 'wallet'}
                    description={`Add $${amount} to wallet`}
                    onSuccess={handleSuccess}
                    onError={(error) => {
                      console.error("💥 Payment error:", error);
                      const errorMsg = typeof error === 'string' ? error : 
                                      error?.message || 
                                      error?.toString() || 
                                      'Payment failed. Please try again.';
                      toast.error(errorMsg);
                      setPaymentError(errorMsg);
                    }}
                  />
                )}

                <button
                  onClick={() => {
                    setStep(1);
                    setPaymentError(null);
                  }}
                  className="w-full text-gray-400 hover:text-white transition"
                >
                  ← Back
                </button>
              </div>
            )}


            {step === 3 && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <Plus className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Payment Successful!</h3>
                <p className="text-gray-300 mb-6">
                  ${parseFloat(amount).toFixed(2)} has been added to your wallet
                </p>
                <Button 
                  onClick={onClose} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  View Balance
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
  );
}
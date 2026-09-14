import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import StripePaymentForm from "../payment/StripePaymentForm";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { creditWalletFromPayment } from "@/functions/creditWalletFromPayment";

export default function AddMoneyModal({ currentUser, onClose }) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [method] = useState("card");
  const [paymentError, setPaymentError] = useState(null);
  const [crediting, setCrediting] = useState(false);
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

  // Stripe has already charged the card by the time this fires (paymentIntentId
  // is a confirmed, succeeded PaymentIntent) -- there is no webhook anywhere in
  // this app that credits a wallet from a deposit, so this call IS the only
  // thing that ever moves the charged money into usd_balance. Skipping it (the
  // previous behavior: show "success" and just poll, hoping something else
  // would update the balance) meant every card deposit charged the customer
  // and silently never credited them.
  const handleSuccess = async (paymentIntentId) => {
    setCrediting(true);
    try {
      await creditWalletFromPayment({
        payment_intent_id: paymentIntentId,
        recipient_email: currentUser.email,
        reference_type: 'wallet_deposit',
        fee_rate: 0, // adding your own money to your own wallet -- no platform cut
      });
      setStep(3);
      toast.success("Payment successful! Your balance has been updated.");
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (err) {
      // The card was already charged -- never imply nothing happened.
      setPaymentError(
        `Your card was charged, but we couldn't add the funds to your balance yet. ` +
        `Please contact support with this reference: ${paymentIntentId}`
      );
      toast.error("Payment went through, but crediting your balance failed. See details below.");
    } finally {
      setCrediting(false);
    }
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

                {paymentError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-400 text-sm">{paymentError}</p>
                  </div>
                )}

                {crediting && (
                  <div className="text-center py-4">
                    <p className="text-gray-300 text-sm">Confirming your deposit...</p>
                  </div>
                )}

                {!crediting && amount && parseFloat(amount) > 0 && (
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
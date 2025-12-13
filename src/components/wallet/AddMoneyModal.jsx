import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, CreditCard, Building, Wallet, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StripePaymentForm from "../payment/StripePaymentForm";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AddMoneyModal({ currentUser, onClose }) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

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
    console.log('💰 Payment completed:', paymentIntent);
    setStep(3);
    toast.success("Payment successful!");
  };

  const handleBankTransfer = async () => {
    setIsProcessing(true);
    try {
      // Create a pending payment record
      await base44.entities.Payment.create({
        amount_usd: parseFloat(amount),
        amount_rri: 0,
        method: "bank",
        status: "pending",
        reference_type: "deposit",
        memo: "Bank transfer to wallet - awaiting confirmation"
      });

      // Create notification
      await base44.entities.Notification.create({
        user_email: currentUser.email,
        type: "payment_received",
        title: "Bank Transfer Initiated",
        message: `Your bank transfer of $${parseFloat(amount).toFixed(2)} is pending. Complete it in the Pending Transfers section.`,
        read: false,
        action_url: "/Wallet"
      });

      toast.success("Bank transfer initiated! Mark it complete once transferred.");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error creating transfer:", error);
      toast.error("Failed to initiate transfer");
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (step !== 3) {
      onClose();
    } else {
      window.location.reload();
    }
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
    <AnimatePresence mode="wait">
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
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
          className="w-full max-w-lg max-h-[90vh] bg-gray-900 rounded-3xl shadow-2xl flex flex-col"
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
                          <p className="text-gray-400 text-sm">Instant • Stripe secured</p>
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
                          <p className="text-white font-semibold">Bank Transfer (ACH)</p>
                          <p className="text-gray-400 text-sm">1-3 business days • No fees</p>
                        </div>
                      </div>
                    </button>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-400 text-xs">
                      💳 More payment methods (Apple Pay, Google Pay, Cash App) available through saved payment methods
                    </p>
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
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                    <p className="text-red-400 text-sm font-semibold mb-2">Payment Error</p>
                    <p className="text-red-300 text-sm">{paymentError}</p>
                    <button
                      onClick={() => {
                        setPaymentError(null);
                        window.location.reload();
                      }}
                      className="mt-3 text-red-400 hover:text-red-300 text-sm underline"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {!paymentError && amount && parseFloat(amount) > 0 && (
                  <StripePaymentForm
                    key={`payment-${amount}-${Date.now()}`}
                    amount={parseFloat(amount)}
                    referenceType="deposit"
                    referenceId={currentUser?.id || 'wallet'}
                    description={`Add $${amount} to wallet`}
                    onSuccess={handleSuccess}
                    onError={(error) => {
                      console.error("💥 Payment error caught:", error);
                      let errorMsg = 'Payment failed';

                      if (typeof error === 'string') {
                        errorMsg = error;
                      } else if (error?.message) {
                        errorMsg = error.message;
                      } else {
                        errorMsg = 'Payment initialization failed';
                      }

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

            {step === 2 && method === "bank" && (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-2">Bank Transfer Amount</p>
                  <p className="text-white text-3xl font-bold">${parseFloat(amount).toFixed(2)}</p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-white font-semibold mb-2">Transfer Instructions</p>
                      <p className="text-gray-300 text-sm mb-4">
                        Please transfer ${parseFloat(amount).toFixed(2)} to our bank account:
                      </p>
                    </div>
                  </div>

                  <div className="bg-black/20 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bank Name:</span>
                      <span className="text-white font-mono">Chase Bank</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Account Name:</span>
                      <span className="text-white font-mono">PlaySoFlo Inc</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Account Number:</span>
                      <span className="text-white font-mono">1234567890</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Routing Number:</span>
                      <span className="text-white font-mono">021000021</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reference:</span>
                      <span className="text-white font-mono">{currentUser?.email}</span>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-400 text-xs">
                      ⚠️ Important: Include your email ({currentUser?.email}) as the transfer reference
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleBankTransfer}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 py-6 text-lg"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating...
                    </div>
                  ) : (
                    "I've Initiated the Transfer"
                  )}
                </Button>

                <button
                  onClick={() => setStep(1)}
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
                  onClick={() => window.location.reload()} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  View Balance
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
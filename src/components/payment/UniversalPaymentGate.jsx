import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { base44 } from "@/api/base44Client";
import { DollarSign, CreditCard, Wallet, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function PaymentForm({ amount, onSuccess, onCancel, itemDetails }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/payment-success",
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Payment successful!");
        onSuccess();
      }
    } catch (err) {
      toast.error("Payment failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-300">Total Amount</span>
          <span className="text-3xl font-bold text-white">${amount.toFixed(2)}</span>
        </div>
        {itemDetails && (
          <div className="text-sm text-gray-400">
            <p>{itemDetails.name}</p>
            {itemDetails.description && <p className="text-gray-500">{itemDetails.description}</p>}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <PaymentElement />
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
        >
          {processing ? (
            "Processing..."
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function UniversalPaymentGate({
  isOpen,
  onClose,
  amount,
  itemType,
  itemId,
  itemDetails,
  onPaymentSuccess,
  currentUser
}) {
  const [clientSecret, setClientSecret] = useState(null);
  const [useWallet, setUseWallet] = useState(false);
  const [processingWallet, setProcessingWallet] = useState(false);

  React.useEffect(() => {
    if (isOpen && !useWallet) {
      createPaymentIntent();
    }
  }, [isOpen, useWallet]);

  const createPaymentIntent = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency: 'usd',
          metadata: {
            item_type: itemType,
            item_id: itemId,
            user_email: currentUser?.email
          }
        })
      });
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      toast.error("Failed to initialize payment");
    }
  };

  const handleWalletPayment = async () => {
    if (!currentUser) {
      toast.error("Please log in to use wallet payment");
      return;
    }

    setProcessingWallet(true);

    try {
      // Check wallet balance
      const balance = currentUser.wallet_balance_usd || 0;
      if (balance < amount) {
        toast.error(`Insufficient wallet balance. You have $${balance.toFixed(2)}, need $${amount.toFixed(2)}`);
        setProcessingWallet(false);
        return;
      }

      // Deduct from wallet
      const newBalance = balance - amount;
      await base44.auth.updateMe({
        wallet_balance_usd: newBalance
      });

      // Create payment record
      await base44.entities.Payment.create({
        payer_email: currentUser.email,
        amount_usd: amount,
        payment_method: "wallet",
        status: "completed",
        item_type: itemType,
        item_id: itemId,
        metadata: itemDetails
      });

      toast.success("Payment successful from wallet!");
      onPaymentSuccess();
      onClose();
    } catch (error) {
      toast.error("Wallet payment failed: " + error.message);
    } finally {
      setProcessingWallet(false);
    }
  };

  const walletBalance = currentUser?.wallet_balance_usd || 0;
  const hasEnoughBalance = walletBalance >= amount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Complete Payment</DialogTitle>
        </DialogHeader>

        {!useWallet ? (
          <div className="space-y-6">
            {/* Payment Method Selection */}
            <div className="flex gap-3">
              <Button
                onClick={() => setUseWallet(false)}
                variant={!useWallet ? "default" : "outline"}
                className="flex-1"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Card
              </Button>
              <Button
                onClick={() => setUseWallet(true)}
                variant={useWallet ? "default" : "outline"}
                className="flex-1"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Wallet
              </Button>
            </div>

            {clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm
                  amount={amount}
                  onSuccess={() => {
                    onPaymentSuccess();
                    onClose();
                  }}
                  onCancel={onClose}
                  itemDetails={itemDetails}
                />
              </Elements>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-gray-400 mt-4">Initializing payment...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Wallet Payment */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-gray-300">Amount to Pay</span>
                <span className="text-3xl font-bold text-white">${amount.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between py-4 border-t border-white/10">
                <span className="text-gray-400">Wallet Balance</span>
                <span className={`text-xl font-semibold ${hasEnoughBalance ? 'text-green-400' : 'text-red-400'}`}>
                  ${walletBalance.toFixed(2)}
                </span>
              </div>

              {itemDetails && (
                <div className="mt-4 pt-4 border-t border-white/10 text-sm text-gray-400">
                  <p className="font-semibold text-white">{itemDetails.name}</p>
                  {itemDetails.description && <p className="text-gray-500 mt-1">{itemDetails.description}</p>}
                </div>
              )}
            </div>

            {!hasEnoughBalance && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-300">
                <p className="font-semibold mb-2">Insufficient Balance</p>
                <p>You need ${(amount - walletBalance).toFixed(2)} more in your wallet.</p>
                <Button
                  onClick={() => {
                    onClose();
                    window.location.href = createPageUrl("Wallet");
                  }}
                  variant="outline"
                  className="w-full mt-3 border-red-500/30 text-red-300"
                >
                  Add Money to Wallet
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setUseWallet(false)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleWalletPayment}
                disabled={!hasEnoughBalance || processingWallet}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {processingWallet ? "Processing..." : `Pay from Wallet`}
              </Button>
            </div>
          </div>
        )}

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-4 border-t border-white/10">
          <Lock className="w-3 h-3" />
          <span>Secured by Stripe & Base44</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { CreditCard, Wallet, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import StripeCheckoutForm from "./StripeCheckoutForm";
import { processUnifiedCheckout } from "@/functions/processUnifiedCheckout";

// Generic purchase modal backed by the real /api/checkout endpoint
// (order_type "digital_product" -> content_purchases, wallet_move credits
// the seller for their cut). itemType maps 1:1 to order_type today since
// the only real caller is ArtistProfile's music track purchase.
const ORDER_TYPE_BY_ITEM_TYPE = {
  music_track: 'digital_product',
};

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
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [processingWallet, setProcessingWallet] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [processingCard, setProcessingCard] = useState(false);

  const orderType = ORDER_TYPE_BY_ITEM_TYPE[itemType];
  const walletBalance = currentUser?.usd_balance || 0;
  const hasEnoughBalance = walletBalance >= amount;

  const checkoutBody = () => ({
    order_type: orderType,
    amount,
    provider_email: itemDetails?.seller_email,
    item_id: itemId,
    item_type: itemType,
    item_title: itemDetails?.name,
  });

  const finish = () => {
    setClientSecret(null);
    setStripePromise(null);
    onPaymentSuccess();
    onClose();
  };

  const handleWalletPayment = async () => {
    if (!currentUser) { toast.error("Please log in to use wallet payment"); return; }
    if (!hasEnoughBalance) { toast.error(`Insufficient wallet balance. You have $${walletBalance.toFixed(2)}, need $${amount.toFixed(2)}`); return; }

    setProcessingWallet(true);
    try {
      const { data } = await processUnifiedCheckout({ ...checkoutBody(), payment_method: 'wallet' });
      if (data?.error) throw new Error(data.error);
      toast.success("Payment successful from wallet!");
      finish();
    } catch (error) {
      toast.error("Wallet payment failed: " + error.message);
    } finally {
      setProcessingWallet(false);
    }
  };

  const loadCardForm = async () => {
    setLoadingStripe(true);
    try {
      const { data } = await processUnifiedCheckout({ ...checkoutBody(), payment_method: 'stripe' });
      if (data?.error) throw new Error(data.error);
      if (!data?.client_secret || !data?.publishable_key) throw new Error('Payment setup failed');
      const sp = await loadStripe(data.publishable_key);
      setStripePromise(sp);
      setClientSecret(data.client_secret);
    } catch (error) {
      toast.error("Failed to initialize payment: " + error.message);
    } finally {
      setLoadingStripe(false);
    }
  };

  const handleCardSuccess = async (paymentIntentId) => {
    setProcessingCard(true);
    try {
      const { data } = await processUnifiedCheckout({ ...checkoutBody(), payment_method: 'stripe', confirm_payment_intent_id: paymentIntentId });
      if (data?.error) throw new Error(data.error);
      toast.success("Payment successful!");
      finish();
    } catch (error) {
      toast.error("Payment failed: " + error.message);
    } finally {
      setProcessingCard(false);
    }
  };

  if (!orderType) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle>Purchase Unavailable</DialogTitle></DialogHeader>
          <p className="text-gray-400 text-sm">This item type isn't set up for checkout yet.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Complete Payment</DialogTitle>
        </DialogHeader>

        {clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#a855f7' } } }}>
            <StripeCheckoutForm
              amount={amount}
              onSuccess={handleCardSuccess}
              onCancel={() => { setClientSecret(null); setStripePromise(null); }}
              isProcessing={processingCard}
              setIsProcessing={setProcessingCard}
            />
          </Elements>
        ) : paymentMethod === "wallet" ? (
          <div className="space-y-6">
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
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => setPaymentMethod("card")} variant="outline" className="flex-1">
                <CreditCard className="w-4 h-4 mr-2" />Pay with Card
              </Button>
              <Button
                onClick={handleWalletPayment}
                disabled={!hasEnoughBalance || processingWallet}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {processingWallet ? "Processing..." : "Pay from Wallet"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
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
            <div className="flex gap-3">
              <Button onClick={() => setPaymentMethod("wallet")} variant="outline" className="flex-1">
                <Wallet className="w-4 h-4 mr-2" />Pay with Wallet
              </Button>
              <Button onClick={loadCardForm} disabled={loadingStripe} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600">
                {loadingStripe ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                {loadingStripe ? "Loading…" : "Continue"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-4 border-t border-white/10">
          <Lock className="w-3 h-3" />
          <span>Secured by Stripe</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

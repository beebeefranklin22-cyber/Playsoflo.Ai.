import React, { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";

// Shared Stripe Elements payment form. Must be rendered inside a Stripe
// <Elements> provider with the PaymentIntent's client_secret. Used by
// UnifiedBookingModal (single-item purchases) and Cart (multi-item cart
// checkout) so the actual card-confirmation wiring only lives in one place.
export default function StripeCheckoutForm({ amount, onSuccess, onCancel, isProcessing, setIsProcessing }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    setError(null);
    const { error: submitError } = await elements.submit();
    if (submitError) { setError(submitError.message); setIsProcessing(false); return; }
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: window.location.href },
    });
    if (confirmError) { setError(confirmError.message); setIsProcessing(false); return; }
    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      onSuccess(paymentIntent.id);
    } else {
      setError("Payment was not completed. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-white/20 text-white">
          Back
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 font-bold">
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
          Pay ${amount?.toFixed(2)}
        </Button>
      </div>
    </form>
  );
}

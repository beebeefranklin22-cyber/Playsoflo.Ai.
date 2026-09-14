import React, { useState, useEffect } from "react";
import { useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";

/**
 * DigitalWalletButton
 * Shows Apple Pay / Google Pay button via Stripe's PaymentRequest API.
 * Only renders if the browser/device supports a digital wallet.
 */
export default function DigitalWalletButton({ amount, clientSecret, description, onSuccess, onError }) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [canPay, setCanPay] = useState(false);
  const [checking, setChecking] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!stripe || !amount) return;

    const amountInCents = Math.round(amount * 100);

    const pr = stripe.paymentRequest({
      country: "US",
      currency: "usd",
      total: {
        label: description || "Total",
        amount: amountInCents,
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
        setCanPay(true);
      }
      setChecking(false);
    });

    pr.on("paymentmethod", async (event) => {
      setProcessing(true);
      try {
        if (!clientSecret) {
          event.complete("fail");
          if (onError) onError("Payment is not ready yet. Please try again.");
          return;
        }

        // Confirm immediately with handleActions:false so the Apple/Google
        // Pay sheet can be dismissed right away (success or fail) instead of
        // hanging open through any 3DS challenge -- this previously called
        // event.complete("success") and reported success WITHOUT ever
        // confirming the PaymentIntent, so the card was never actually
        // charged at all.
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: event.paymentMethod.id },
          { handleActions: false }
        );

        if (confirmError) {
          event.complete("fail");
          if (onError) onError(confirmError.message || "Digital wallet payment failed");
          return;
        }

        event.complete("success");

        if (paymentIntent.status === "requires_action") {
          const { error: actionError, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(clientSecret);
          if (actionError) {
            if (onError) onError(actionError.message || "Additional authentication failed");
            return;
          }
          if (confirmedIntent.status === "succeeded" && onSuccess) onSuccess(confirmedIntent.id);
        } else if (paymentIntent.status === "succeeded") {
          if (onSuccess) onSuccess(paymentIntent.id);
        } else {
          if (onError) onError(`Payment not completed (status: ${paymentIntent.status})`);
        }
      } catch (err) {
        event.complete("fail");
        if (onError) onError(err.message || "Digital wallet payment failed");
      } finally {
        setProcessing(false);
      }
    });

    pr.on("cancel", () => {
      setProcessing(false);
    });

    return () => {
      // Cleanup: no explicit destroy needed for PaymentRequest
    };
  }, [stripe, amount, description, clientSecret]);

  if (checking) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400 text-sm">Checking wallet availability...</span>
      </div>
    );
  }

  if (!canPay || !paymentRequest) return null;

  return (
    <div className="space-y-3">
      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-gray-500 text-xs font-medium whitespace-nowrap">Pay instantly with</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <button
        type="button"
        disabled={processing}
        onClick={() => paymentRequest.show()}
        className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        {processing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            {/* Apple Pay / Google Pay logos */}
            <span className="text-lg">🍎</span>
            <span>Pay</span>
            <span className="text-gray-400 text-sm font-normal">or</span>
            <span className="text-base">G</span>
            <span className="text-blue-400 text-base font-bold">o</span>
            <span className="text-red-400 text-base font-bold">o</span>
            <span className="text-yellow-400 text-base font-bold">g</span>
            <span className="text-blue-400 text-base font-bold">l</span>
            <span className="text-green-400 text-base font-bold">e</span>
            <span>Pay</span>
          </>
        )}
      </button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-gray-500 text-xs font-medium">or pay with card</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>
    </div>
  );
}
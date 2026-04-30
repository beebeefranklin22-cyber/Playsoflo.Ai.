import React, { useState, useEffect } from "react";
import { useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";

/**
 * DigitalWalletButton
 * Shows Apple Pay / Google Pay button via Stripe's PaymentRequest API.
 * Only renders if the browser/device supports a digital wallet.
 */
export default function DigitalWalletButton({ amount, description, onSuccess, onError }) {
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
        // Confirm the payment on the server side via the existing payment intent's client secret.
        // The parent must pass `clientSecret` for this to work.
        // We fire onSuccess with the paymentMethod id so the parent can confirm server-side.
        event.complete("success");
        if (onSuccess) onSuccess(event.paymentMethod.id, "digital_wallet");
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
  }, [stripe, amount, description]);

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
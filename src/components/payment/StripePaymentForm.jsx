import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  PaymentElement,
  Elements,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Shield } from "lucide-react";

const CheckoutForm = ({ amount, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage("Payment system is still loading. Please wait a moment.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // First, ensure the payment element is ready
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message);
        setIsProcessing(false);
        if (onError) onError(submitError);
        return;
      }

      // Then confirm the payment
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message);
        setIsProcessing(false);
        if (onError) onError(error);
      } else {
        setIsProcessing(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setErrorMessage(err.message || "An error occurred during payment");
      setIsProcessing(false);
      if (onError) onError(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-green-400" />
          <div>
            <p className="text-white font-semibold">Secure Payment</p>
            <p className="text-gray-400 text-xs">PCI-DSS compliant • 256-bit encryption</p>
          </div>
        </div>

        <PaymentElement 
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-6 text-lg font-bold"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Pay ${amount?.toFixed(2) || '0.00'}
          </div>
        )}
      </Button>

      <p className="text-center text-gray-500 text-xs">
        By completing this purchase, you agree to our Terms of Service
      </p>
    </form>
  );
};

export default function StripePaymentForm({ 
  amount, 
  referenceType, 
  referenceId, 
  description,
  onSuccess, 
  onError,
  metadata = {},
  publishableKey = null
}) {
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    const initStripe = async () => {
      try {
        const key = publishableKey || "pk_test_51SFfJq2ORNyJCJkCOcqPJR27TkvEAThfkGkAkMaASgexCL3RSzqchqYWqA2LwnJEVJxiY8ID8tXGrBulPVEOrd9Z00L5wTr0p6";
        setStripePromise(loadStripe(key));
      } catch (error) {
        console.error("Stripe initialization error:", error);
        setInitError(error);
      }
    };
    
    initStripe();
  }, [publishableKey]);

  useEffect(() => {
    if (amount && referenceType && referenceId) {
      createPaymentIntent();
    }
  }, [amount, referenceType, referenceId]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      
      const { base44 } = await import("@/api/base44Client");
      
      const response = await base44.functions.invoke('processStripePayment', {
        amount,
        description,
        reference_type: referenceType,
        reference_id: referenceId,
        metadata
      });

      if (response.data.clientSecret) {
        setClientSecret(response.data.clientSecret);
      } else {
        throw new Error('Failed to create payment intent');
      }
    } catch (error) {
      console.error('Payment intent creation error:', error);
      const errorMsg = error?.message || error?.error || 'Failed to initialize payment';
      const errorObj = new Error(errorMsg);
      setInitError(errorObj);
      if (onError) onError(errorObj);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (initError || !clientSecret || !stripePromise) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <p className="text-red-400">Failed to initialize payment. Please ensure Stripe is configured properly.</p>
        {initError && (
          <p className="text-red-400 text-xs mt-2">{initError.message}</p>
        )}
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm 
        amount={amount} 
        onSuccess={onSuccess} 
        onError={onError} 
      />
    </Elements>
  );
}
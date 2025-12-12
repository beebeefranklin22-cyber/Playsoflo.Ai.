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
  const [elementsReady, setElementsReady] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      const msg = "Payment system is still loading. Please wait a moment.";
      setErrorMessage(msg);
      if (onError) onError(new Error(msg));
      return;
    }

    if (!elementsReady) {
      const msg = "Please wait for payment form to load completely.";
      setErrorMessage(msg);
      if (onError) onError(new Error(msg));
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

      // Then confirm the payment WITHOUT redirect
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: window.location.href,
        }
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        setErrorMessage(error.message);
        setIsProcessing(false);
        if (onError) onError(error);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', paymentIntent);
        setIsProcessing(false);
        if (onSuccess) onSuccess();
      } else {
        console.error('Payment not completed:', paymentIntent);
        const msg = 'Payment was not completed. Please try again.';
        setErrorMessage(msg);
        setIsProcessing(false);
        if (onError) onError(new Error(msg));
      }
    } catch (err) {
      const msg = err.message || "An error occurred during payment";
      setErrorMessage(msg);
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
          onReady={() => setElementsReady(true)}
        />
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elementsReady || isProcessing}
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
        let key = publishableKey;
        if (!key) {
          // Fetch publishable key from environment
          key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51SFfJq2ORNyJCJkCOcqPJR27TkvEAThfkGkAkMaASgexCL3RSzqchqYWqA2LwnJEVJxiY8ID8tXGrBulPVEOrd9Z00L5wTr0p6";
        }
        setStripePromise(loadStripe(key));
      } catch (error) {
        console.error("Stripe initialization error:", error);
        setInitError(error);
      }
    };
    
    initStripe();
  }, [publishableKey]);

  useEffect(() => {
    if (amount) {
      createPaymentIntent();
    }
  }, [amount]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setInitError(null);
      
      const { base44 } = await import("@/api/base44Client");
      
      console.log('Creating payment intent with:', { amount, description, referenceType, referenceId });
      
      const response = await base44.functions.invoke('processStripePayment', {
        amount,
        description: description || `Payment of $${amount}`,
        metadata: {
          reference_type: referenceType || 'deposit',
          reference_id: referenceId || 'wallet',
          ...metadata
        }
      });

      console.log('Payment intent response:', response);

      if (response?.data?.clientSecret) {
        setClientSecret(response.data.clientSecret);
      } else {
        throw new Error(response?.data?.error || 'No client secret received from server');
      }
    } catch (error) {
      console.error('Payment intent creation error:', error);
      console.error('Error details:', error.response?.data || error);
      const errorMsg = error?.response?.data?.error || error?.message || error?.error || 'Failed to initialize payment. Please check console for details.';
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

  if (initError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <p className="text-red-400 font-semibold mb-2">Payment initialization failed</p>
        <p className="text-red-400 text-sm">{initError.message}</p>
        <Button 
          onClick={createPaymentIntent}
          className="mt-4 bg-red-600 hover:bg-red-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
        <p className="text-yellow-400">Waiting for payment system to initialize...</p>
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
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

  console.log('=== CHECKOUT FORM RENDER ===');
  console.log('Stripe loaded:', !!stripe);
  console.log('Elements loaded:', !!elements);
  console.log('Elements ready:', elementsReady);
  console.log('Amount:', amount);

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

        <div className="min-h-[200px] relative">
          {!elementsReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-lg">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Loading payment form...</p>
              </div>
            </div>
          )}
          <PaymentElement 
            options={{
              layout: "tabs",
            }}
            onReady={() => {
              console.log('✅ PaymentElement is READY');
              setElementsReady(true);
            }}
            onLoadError={(error) => {
              console.error('❌ PaymentElement load error:', error);
              setErrorMessage('Failed to load payment form');
            }}
          />
        </div>
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
  const [formReady, setFormReady] = useState(false);

  useEffect(() => {
    const initStripe = async () => {
      try {
        let key = publishableKey;
        if (!key) {
          key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51SFfJq2ORNyJCJkCOcqPJR27TkvEAThfkGkAkMaASgexCL3RSzqchqYWqA2LwnJEVJxiY8ID8tXGrBulPVEOrd9Z00L5wTr0p6";
        }
        console.log('Loading Stripe with key:', key.substring(0, 20) + '...');
        const stripe = await loadStripe(key);
        setStripePromise(stripe);
      } catch (error) {
        console.error("Stripe initialization error:", error);
        setInitError(error);
      }
    };
    
    initStripe();
  }, [publishableKey]);

  useEffect(() => {
    console.log('Amount changed:', amount);
    if (amount && amount > 0 && !clientSecret) {
      createPaymentIntent();
    }
  }, [amount]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setInitError(null);
      
      console.log('=== STARTING PAYMENT INTENT CREATION ===');
      console.log('Amount:', amount);
      console.log('Description:', description);
      console.log('Reference Type:', referenceType);
      console.log('Reference ID:', referenceId);
      
      const { base44 } = await import("@/api/base44Client");
      
      const response = await base44.functions.invoke('processStripePayment', {
        amount,
        description: description || `Payment of $${amount}`,
        metadata: {
          reference_type: referenceType || 'deposit',
          reference_id: referenceId || 'wallet',
          ...metadata
        }
      });

      console.log('=== PAYMENT INTENT RESPONSE ===');
      console.log('Full response:', response);
      console.log('Client secret:', response?.data?.clientSecret);

      if (response?.data?.clientSecret) {
        console.log('✅ Client secret received, setting state');
        setClientSecret(response.data.clientSecret);
        setFormReady(true);
      } else {
        console.error('❌ No client secret in response');
        throw new Error(response?.data?.error || 'No client secret received from server');
      }
    } catch (error) {
      console.error('❌ Payment intent creation error:', error);
      console.error('Error details:', error.response?.data || error);
      const errorMsg = error?.response?.data?.error || error?.message || error?.error || 'Failed to initialize payment';
      const errorObj = new Error(errorMsg);
      setInitError(errorObj);
      if (onError) onError(errorObj);
    } finally {
      console.log('=== PAYMENT INTENT CREATION COMPLETE ===');
      setLoading(false);
    }
  };

  console.log('=== RENDER CHECK ===');
  console.log('Loading:', loading);
  console.log('Form ready:', formReady);
  console.log('Init error:', initError);
  console.log('Client secret exists:', !!clientSecret);
  console.log('Stripe promise exists:', !!stripePromise);

  // Once form is ready, keep it rendered
  if (formReady && clientSecret && stripePromise) {
    console.log('✅ Rendering Stripe Elements form (stable)');
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

  if (initError) {
    console.log('Rendering error state');
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

  if (loading) {
    console.log('Rendering loading state');
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-white ml-3">Initializing payment...</p>
      </div>
    );
  }

  console.log('Waiting for initialization to complete');
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      <p className="text-white ml-3">Setting up payment form...</p>
    </div>
  );
}
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

        <PaymentElement 
          options={{
            layout: "tabs",
          }}
          onReady={() => {
            console.log('✅ PaymentElement ready');
            setElementsReady(true);
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
  const [renderAttempt, setRenderAttempt] = useState(0);

  useEffect(() => {
    const initStripe = async () => {
      try {
        const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!key) {
          throw new Error('Stripe publishable key not found');
        }
        console.log('🔑 Loading Stripe...');
        const stripe = await loadStripe(key);
        console.log('✅ Stripe loaded successfully');
        setStripePromise(stripe);
      } catch (error) {
        console.error("❌ Stripe initialization error:", error);
        setInitError(error);
      }
    };
    
    initStripe();
  }, []);

  useEffect(() => {
    console.log('💰 Amount effect triggered:', amount, 'Has secret:', !!clientSecret, 'Has stripe:', !!stripePromise);
    if (amount && amount > 0 && !clientSecret && stripePromise) {
      console.log('🚀 Creating payment intent...');
      createPaymentIntent();
    }
  }, [amount, stripePromise]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setInitError(null);
      
      console.log('💳 Creating payment intent for $' + amount);
      
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

      console.log('📦 Response:', response);

      if (response?.data?.clientSecret) {
        console.log('✅ Client secret received');
        setClientSecret(response.data.clientSecret);
        // Wait for Stripe to be ready before showing form
        await new Promise(resolve => setTimeout(resolve, 500));
        setFormReady(true);
      } else {
        throw new Error('No client secret received');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to initialize payment';
      setInitError(new Error(errorMsg));
      if (onError) onError(new Error(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  console.log('🎨 RENDER:', { loading, formReady, hasError: !!initError, hasSecret: !!clientSecret, hasStripe: !!stripePromise });

  // Show error
  if (initError) {
    console.log('🔴 ERROR:', initError.message);
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <p className="text-red-400 font-semibold mb-2">Setup failed</p>
        <p className="text-red-400 text-sm mb-4">{initError.message}</p>
        <Button 
          onClick={() => {
            setInitError(null);
            createPaymentIntent();
          }}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Show loading
  if (loading || !stripePromise) {
    console.log('⏳ LOADING');
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
        <p className="text-white">Setting up payment...</p>
      </div>
    );
  }

  // Render form
  if (clientSecret && stripePromise) {
    console.log('✅ Rendering form');
    return (
      <Elements 
        stripe={stripePromise} 
        options={{ 
          clientSecret,
          appearance: { theme: 'night' }
        }}
      >
        <CheckoutForm 
          amount={amount} 
          onSuccess={onSuccess} 
          onError={onError} 
        />
      </Elements>
    );
  }

  // Waiting for setup
  console.log('⏳ Waiting for payment setup...');
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
      <p className="text-white">Initializing...</p>
    </div>
  );
}
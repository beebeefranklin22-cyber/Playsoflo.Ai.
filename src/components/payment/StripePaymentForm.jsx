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
      const msg = "Payment system is still loading. Please wait a moment.";
      setErrorMessage(msg);
      if (onError) onError(new Error(msg));
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message);
        setIsProcessing(false);
        if (onError) onError(submitError);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: window.location.href,
        }
      });

      if (error) {
        console.error('Payment error:', error);
        setErrorMessage(error.message);
        setIsProcessing(false);
        if (onError) onError(error);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('✅ Payment succeeded');
        if (onSuccess) onSuccess(paymentIntent);
      } else if (paymentIntent && paymentIntent.status === 'processing') {
        console.log('⏳ Payment processing');
        if (onSuccess) onSuccess(paymentIntent);
      } else {
        const msg = 'Payment was not completed. Please try again.';
        setErrorMessage(msg);
        setIsProcessing(false);
        if (onError) onError(new Error(msg));
      }
    } catch (err) {
        console.error('Payment submission error:', err);
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
        />
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
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
  metadata = {}
}) {
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        setInitError(null);
        
        console.log('🔄 Starting payment intent creation for $' + amount);
        
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

        console.log('📦 Raw response:', JSON.stringify(response, null, 2));

        if (!mounted) {
          console.log('⚠️ Component unmounted, skipping state update');
          return;
        }

        // Handle error responses - check multiple possible error locations
        let errorMsg = null;

        if (response?.error) {
          errorMsg = typeof response.error === 'string' ? response.error : response.error?.message || JSON.stringify(response.error);
        } else if (response?.data?.error) {
          errorMsg = response.data.error;
        } else if (!response?.data?.clientSecret || !response?.data?.publishableKey) {
          errorMsg = 'Invalid payment response - missing credentials';
        }

        if (errorMsg) {
          console.error('❌ Payment initialization failed:', errorMsg);
          throw new Error(errorMsg);
        }

        const { clientSecret, publishableKey } = response.data;

        if (!clientSecret || !publishableKey) {
          console.error('❌ Missing credentials:', { clientSecret: !!clientSecret, publishableKey: !!publishableKey });
          throw new Error('Missing payment credentials from server');
        }

        console.log('✅ Loading Stripe with publishable key...');
        const stripe = await loadStripe(publishableKey);

        if (!stripe) {
          throw new Error('Failed to load Stripe');
        }

        if (!mounted) return;

        console.log('✅ Stripe loaded successfully');
        setStripePromise(stripe);
        setClientSecret(clientSecret);
        setLoading(false);
      } catch (error) {
          console.error('❌ Payment setup error:', error);
          console.error('Error type:', typeof error);
          console.error('Error object keys:', error ? Object.keys(error) : 'null');

          if (!mounted) return;

          let errorMsg = 'Payment initialization failed';

          try {
            if (typeof error === 'string') {
              errorMsg = error;
            } else if (error?.message) {
              errorMsg = error.message;
            } else if (error?.data?.error) {
              errorMsg = error.data.error;
            } else if (error?.error) {
              errorMsg = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
            } else {
              errorMsg = `Payment setup failed: ${JSON.stringify(error)}`;
            }
          } catch (stringifyError) {
            errorMsg = 'Payment initialization failed - unable to parse error';
          }

          console.error('Final error message:', errorMsg);
          setInitError(errorMsg);
          setLoading(false);
          if (onError) onError(new Error(errorMsg));
      }
    };
    
    createPaymentIntent();
    
    return () => {
      mounted = false;
    };
  }, [amount]);

  if (initError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <p className="text-red-400 font-semibold mb-2">Setup failed</p>
        <p className="text-red-400 text-sm mb-4">{typeof initError === 'string' ? initError : initError.message}</p>
        <Button 
          onClick={() => window.location.reload()}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (loading || !clientSecret || !stripePromise) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
        <p className="text-white text-sm">Setting up payment...</p>
      </div>
    );
  }

  return (
    <div key={clientSecret}>
      <Elements 
        stripe={stripePromise} 
        options={{ 
          clientSecret,
          appearance: { 
            theme: 'night',
            variables: {
              colorPrimary: '#8b5cf6',
            }
          }
        }}
      >
        <CheckoutForm 
          amount={amount} 
          onSuccess={onSuccess} 
          onError={onError} 
        />
      </Elements>
    </div>
  );
}
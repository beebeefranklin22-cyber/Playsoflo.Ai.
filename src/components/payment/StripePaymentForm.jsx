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
import DigitalWalletButton from "./DigitalWalletButton";

const CheckoutForm = ({ amount, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [suggestedAction, setSuggestedAction] = useState(null);

  const getErrorDetails = (error) => {
    const errorCode = error.code || error.decline_code;
    let message = 'Payment failed. Please try again.';
    let action = 'Try again or contact support if the issue persists.';

    // Card-specific errors
    if (errorCode === 'card_declined' || error.decline_code) {
      message = 'Your card was declined.';
      action = 'Please try a different payment method or contact your bank.';
    } else if (errorCode === 'insufficient_funds') {
      message = 'Your card has insufficient funds.';
      action = 'Please use a different card or add funds to your account.';
    } else if (errorCode === 'expired_card') {
      message = 'Your card has expired.';
      action = 'Please update your card information or use a different card.';
    } else if (errorCode === 'incorrect_cvc' || errorCode === 'invalid_cvc') {
      message = 'The security code (CVC) is incorrect.';
      action = 'Please check your card and re-enter the correct CVC.';
    } else if (errorCode === 'incorrect_number' || errorCode === 'invalid_number') {
      message = 'The card number is incorrect.';
      action = 'Please check your card number and try again.';
    } else if (errorCode === 'processing_error') {
      message = 'An error occurred while processing your card.';
      action = 'Please try again in a few moments.';
    } else if (errorCode === 'lost_card' || errorCode === 'stolen_card') {
      message = 'This card has been reported as lost or stolen.';
      action = 'Please contact your bank or use a different card.';
    } else if (errorCode === 'fraudulent') {
      message = 'This transaction was flagged as potentially fraudulent.';
      action = 'Please contact your bank to authorize this transaction.';
    } else if (errorCode === 'authentication_required') {
      message = 'Additional authentication is required.';
      action = 'Please complete the authentication with your bank.';
    } else if (error.type === 'validation_error') {
      message = 'Please check your payment information.';
      action = 'Ensure all fields are filled out correctly.';
    } else if (error.message) {
      message = error.message;
    }

    return { message, action };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      const msg = "Payment system is still loading. Please wait a moment.";
      setErrorMessage(msg);
      if (onError) onError(msg);
      return;
    }

    // Confirmation dialog before processing payment
    const confirmMessage = `Confirm Payment\n\nAmount: $${amount?.toFixed(2) || '0.00'}\n\nThis charge will be processed immediately. Continue?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        const msg = submitError.message || 'Could not submit payment form';
        console.error('Submit error:', msg);
        setErrorMessage(msg);
        setIsProcessing(false);
        if (onError) onError(msg);
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
        const errorDetails = getErrorDetails(error);
        setErrorMessage(errorDetails.message);
        setSuggestedAction(errorDetails.action);
        setIsProcessing(false);
        if (onError) onError(errorDetails.message);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('✅ Payment succeeded');
        if (onSuccess) onSuccess(paymentIntent.id);
      } else if (paymentIntent && paymentIntent.status === 'processing') {
        console.log('⏳ Payment processing');
        if (onSuccess) onSuccess(paymentIntent.id);
      } else {
        const msg = 'Payment was not completed. Please try again.';
        setErrorMessage(msg);
        setIsProcessing(false);
        if (onError) onError(msg);
      }
    } catch (err) {
        console.error('Payment submission error:', err);
        const errorDetails = getErrorDetails(err);
        const errorMsg = errorDetails.message || (err instanceof Error ? err.message : String(err));
        setErrorMessage(errorMsg);
        setSuggestedAction(errorDetails.action);
        setIsProcessing(false);
        if (onError) onError(errorMsg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Apple Pay / Google Pay — only shows on supported devices */}
      <DigitalWalletButton
        amount={amount}
        description="PlaySoFlo Payment"
        onSuccess={(paymentMethodId) => {
          if (onSuccess) onSuccess(paymentMethodId);
        }}
        onError={(msg) => {
          setErrorMessage(msg);
          if (onError) onError(msg);
        }}
      />

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
            // Disable Stripe Link & external wallets that redirect users out of the app.
            // Apple/Google Pay are handled separately by DigitalWalletButton above.
            wallets: { applePay: 'never', googlePay: 'never' },
          }}
        />
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="flex-1">
              <p className="text-red-400 font-semibold text-sm">{errorMessage}</p>
              {suggestedAction && (
                <p className="text-red-300 text-xs mt-1">{suggestedAction}</p>
              )}
            </div>
          </div>
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

        console.log('🔄 Starting payment for $' + amount);

        const { base44 } = await import("@/api/base44Client");

        console.log('📤 Calling processStripePayment...');
        const response = await base44.functions.invoke('processStripePayment', {
          amount,
          description: description || `Payment of $${amount}`,
          metadata: {
            reference_type: referenceType || 'deposit',
            reference_id: referenceId || 'wallet',
            ...metadata
          }
        });

        console.log('📦 Raw response type:', typeof response);
        console.log('📦 Raw response:', response);

        // Try to safely log the response
        try {
          console.log('📦 Full response JSON:', JSON.stringify(response, null, 2));
        } catch (e) {
          console.log('⚠️ Could not stringify response');
        }

        if (!mounted) {
          console.log('⚠️ Component unmounted');
          return;
        }

        // Check for errors in response
        if (response?.error) {
          let errorMsg = 'Payment initialization failed';
          try {
            errorMsg = typeof response.error === 'string' 
              ? response.error 
              : (response.error?.message || JSON.stringify(response.error));
          } catch {
            errorMsg = 'Payment error occurred';
          }
          console.error('❌ Error in response:', errorMsg);
          throw new Error(errorMsg);
        }

        // Get data from response - handle axios response structure
        let data = null;

        // Try multiple ways to extract data
        if (response?.data?.data) {
          data = response.data.data;
          console.log('📦 Found data at response.data.data');
        } else if (response?.data) {
          data = response.data;
          console.log('📦 Found data at response.data');
        } else {
          data = response;
          console.log('📦 Using response as data');
        }

        console.log('📦 Data type:', typeof data);
        console.log('📦 Data keys:', data ? Object.keys(data) : 'null');

        try {
          console.log('📦 Extracted data JSON:', JSON.stringify(data, null, 2));
        } catch {
          console.log('⚠️ Could not stringify data');
        }

        // Validate we have the required credentials
        const hasClientSecret = !!(data?.clientSecret);
        const hasPublishableKey = !!(data?.publishableKey);

        console.log('🔍 Validation:', { hasClientSecret, hasPublishableKey });

        if (!hasClientSecret) {
          console.error('❌ Missing clientSecret');
          console.error('❌ Data structure:', data);
          throw new Error('Payment initialization failed - no client secret received. Please try again or contact support.');
        }

        if (!hasPublishableKey) {
          console.error('❌ Missing publishableKey');
          console.error('❌ Data structure:', data);
          throw new Error('Payment initialization failed - no publishable key received. Please try again or contact support.');
        }

        console.log('✅ Got clientSecret:', data.clientSecret.substring(0, 20) + '...');
        console.log('✅ Got publishableKey:', data.publishableKey.substring(0, 20) + '...');

        console.log('✅ Credentials received, loading Stripe...');
        const stripe = await loadStripe(data.publishableKey);

        if (!stripe) {
          throw new Error('Failed to load Stripe');
        }

        if (!mounted) return;

        console.log('✅ Stripe loaded successfully');
        setStripePromise(stripe);
        setClientSecret(data.clientSecret);
        setLoading(false);
      } catch (error) {
          console.error('❌ Setup error:', error);
          console.error('❌ Error type:', typeof error);
          console.error('❌ Error keys:', error ? Object.keys(error) : 'null');

          if (!mounted) return;

          let errorMsg = 'Payment setup failed';

          try {
            // Try different ways to extract error message
            if (typeof error === 'string') {
              errorMsg = error;
            } else if (error instanceof Error) {
              errorMsg = error.message || 'Unknown error';
            } else if (error?.response?.data?.error) {
              errorMsg = String(error.response.data.error);
            } else if (error?.data?.error) {
              errorMsg = String(error.data.error);
            } else if (error?.error) {
              errorMsg = typeof error.error === 'string' ? error.error : String(error.error);
            } else if (error?.message) {
              errorMsg = String(error.message);
            } else if (error) {
              // Last resort: try to JSON stringify
              try {
                const jsonStr = JSON.stringify(error);
                if (jsonStr && jsonStr !== '{}') {
                  errorMsg = 'Error: ' + jsonStr;
                }
              } catch {
                errorMsg = 'Unable to initialize payment. Please refresh and try again.';
              }
            }
          } catch (stringifyError) {
            console.error('Error stringifying error:', stringifyError);
            errorMsg = 'Payment initialization error. Please refresh and try again.';
          }

          console.error('❌ Final error message:', errorMsg);
          setInitError(errorMsg);
          setLoading(false);
          if (onError) onError(errorMsg);
      }
    };

    createPaymentIntent();
    
    return () => {
      mounted = false;
    };
  }, [amount]);

  if (initError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <p className="text-red-400 font-semibold mb-2">Payment Setup Error</p>
        <p className="text-red-300 text-sm mb-4">{initError}</p>
        <button
          onClick={() => window.location.reload()}
          className="py-2 px-6 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition"
        >
          Refresh and Try Again
        </button>
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
          // Disable Stripe Link so users aren't pulled out of the app to verify
          loader: 'always',
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
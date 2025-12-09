import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";

/**
 * PAYMENT SUCCESS PAGE
 * 
 * This page is shown after a successful Stripe Checkout session.
 * The session_id is passed as a URL parameter.
 */

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    // Get session_id from URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get('session_id');
    setSessionId(id);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center p-6">
      <Card className="bg-white/5 border-white/10 max-w-md w-full">
        <CardContent className="p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-white mb-3">
            Payment Successful!
          </h1>
          <p className="text-gray-300 mb-6">
            Your payment has been processed successfully. The seller will receive their funds automatically.
          </p>

          {/* Session ID */}
          {sessionId && (
            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <p className="text-gray-400 text-sm mb-1">Session ID</p>
              <p className="text-white font-mono text-xs break-all">{sessionId}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={() => navigate(createPageUrl('StripeStorefront'))}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Continue Shopping
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('Home'))}
              className="w-full"
            >
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
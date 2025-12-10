import React, { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import confetti from "canvas-confetti";

export default function PaymentSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Celebrate with confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-gray-950 p-6 flex items-center justify-center">
      <Card className="bg-white/5 border-white/10 max-w-md w-full">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">Payment Successful!</h1>
          <p className="text-gray-400 mb-8">
            Thank you for your purchase. You'll receive a confirmation email shortly.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => navigate(createPageUrl('StripeConnectStorefront'))}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Continue Shopping
            </Button>
            <Button
              onClick={() => navigate(createPageUrl('Home'))}
              variant="outline"
              className="w-full bg-white/5 border-white/20"
            >
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
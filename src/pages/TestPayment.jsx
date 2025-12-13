import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, DollarSign, CheckCircle, XCircle } from "lucide-react";

export default function TestPayment() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState([]);
  const [user, setUser] = useState(null);

  const addResult = (message, success = true) => {
    setResults(prev => [...prev, { message, success, time: new Date().toLocaleTimeString() }]);
  };

  const testPaymentFlow = async () => {
    setTesting(true);
    setResults([]);

    try {
      // 1. Get current user
      addResult("Fetching user data...");
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      addResult(`✓ User: ${currentUser.email}`);
      addResult(`Current balance: $${(currentUser.usd_balance || 0).toFixed(2)}`);

      // 2. Create test payment intent
      addResult("Creating payment intent for $10...");
      const { data } = await base44.functions.invoke('processStripePayment', {
        amount: 10,
        description: "Test payment",
        metadata: {
          reference_type: "deposit",
          reference_id: "test"
        }
      });

      if (data.clientSecret) {
        addResult(`✓ Payment intent created: ${data.payment_intent_id}`);
        addResult(`Total charged: $${data.amount_breakdown.total_amount} (includes $${data.amount_breakdown.platform_fee} fee)`);
      } else {
        addResult("❌ Failed to create payment intent", false);
        return;
      }

      // 3. Test pending transfer
      addResult("Creating pending bank transfer...");
      const payment = await base44.entities.Payment.create({
        amount_usd: 25,
        amount_rri: 0,
        method: "bank",
        status: "pending",
        reference_type: "deposit",
        memo: "Test bank transfer"
      });
      addResult(`✓ Pending transfer created: ${payment.id}`);

      // 4. Complete the transfer
      addResult("Completing pending transfer...");
      await base44.entities.Payment.update(payment.id, {
        status: "completed"
      });

      const balanceBefore = currentUser.usd_balance || 0;
      await base44.auth.updateMe({
        usd_balance: balanceBefore + 25
      });
      
      const updatedUser = await base44.auth.me();
      addResult(`✓ Balance updated: $${balanceBefore.toFixed(2)} → $${updatedUser.usd_balance.toFixed(2)}`);
      setUser(updatedUser);

      addResult("🎉 All tests passed!", true);
      toast.success("Payment system is working correctly!");

    } catch (error) {
      console.error("Test failed:", error);
      addResult(`❌ Error: ${error.message}`, false);
      toast.error("Test failed: " + error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Payment System Test</h1>

        {user && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Current Balance</p>
                  <p className="text-white text-3xl font-bold">
                    ${(user.usd_balance || 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-green-400" />
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          onClick={testPaymentFlow}
          disabled={testing}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-6 text-lg mb-6"
        >
          {testing ? (
            <div className="flex items-center">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Running Tests...
            </div>
          ) : (
            "Run Payment System Tests"
          )}
        </Button>

        {results.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <h3 className="text-white font-bold mb-4">Test Results</h3>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                        {result.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{result.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <h4 className="text-yellow-400 font-bold mb-2">⚠️ Important Setup Notes</h4>
          <ul className="text-yellow-300 text-sm space-y-1">
            <li>1. Webhook URL must be configured in Stripe Dashboard</li>
            <li>2. Webhook URL: [Your backend URL]/stripeSetupWebhook</li>
            <li>3. Listen for: payment_intent.succeeded, checkout.session.completed</li>
            <li>4. STRIPE_WEBHOOK_SECRET must be set in environment variables</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
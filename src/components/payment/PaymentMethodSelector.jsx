import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Wallet, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import StripePaymentForm from "./StripePaymentForm";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PaymentMethodSelector({ 
  amount, 
  referenceType, 
  referenceId, 
  description,
  onSuccess,
  onCancel 
}) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);

  const paymentMethods = [
    {
      id: 'stripe',
      name: 'Credit/Debit Card',
      description: 'Visa, Mastercard, Amex',
      icon: CreditCard,
      color: 'from-blue-600 to-indigo-600'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Fast & secure',
      icon: Wallet,
      color: 'from-blue-500 to-blue-700'
    },
    {
      id: 'wallet',
      name: 'SoFlo Wallet',
      description: 'Instant payment',
      icon: DollarSign,
      color: 'from-purple-600 to-pink-600'
    }
  ];

  const handlePayPal = async () => {
    setProcessing(true);
    try {
      const { data } = await base44.functions.invoke('processPayPalPayment', {
        amount,
        reference_type: referenceType,
        reference_id: referenceId,
        description
      });

      if (data.approval_url) {
        window.location.href = data.approval_url;
      }
    } catch (error) {
      toast.error('PayPal payment failed: ' + error.message);
      setProcessing(false);
    }
  };

  const handleWallet = async () => {
    setProcessing(true);
    try {
      const user = await base44.auth.me();
      if (user.usd_balance < amount) {
        toast.error('Insufficient balance. Please add funds to your wallet.');
        setProcessing(false);
        return;
      }

      // Process wallet payment
      await base44.entities.Payment.create({
        amount_usd: amount,
        method: 'internal_transfer',
        status: 'completed',
        reference_type: referenceType,
        reference_id: referenceId
      });

      // Update user balance
      await base44.auth.updateMe({ 
        usd_balance: user.usd_balance - amount 
      });

      toast.success('Payment successful!');
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error('Wallet payment failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (selectedMethod === 'stripe') {
    return (
      <div>
        <Button 
          onClick={() => setSelectedMethod(null)} 
          variant="ghost"
          className="mb-4"
        >
          ← Back to payment methods
        </Button>
        <StripePaymentForm
          amount={amount}
          referenceType={referenceType}
          referenceId={referenceId}
          description={description}
          onSuccess={onSuccess}
          onError={(error) => toast.error('Payment failed: ' + error.message)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-white font-bold text-lg mb-4">Select Payment Method</h3>
      
      {paymentMethods.map((method, index) => (
        <motion.div
          key={method.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card 
            className="bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition"
            onClick={() => {
              if (method.id === 'stripe') {
                setSelectedMethod('stripe');
              } else if (method.id === 'paypal') {
                handlePayPal();
              } else if (method.id === 'wallet') {
                handleWallet();
              }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${method.color} flex items-center justify-center`}>
                  <method.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">{method.name}</h4>
                  <p className="text-gray-400 text-sm">{method.description}</p>
                </div>
                <div className="text-white">→</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {onCancel && (
        <Button 
          onClick={onCancel} 
          variant="outline"
          className="w-full bg-white/5 border-white/20"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Crown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import StripePaymentForm from "../payment/StripePaymentForm";

const subscriptionTiers = [
  {
    id: "standard",
    name: "Standard",
    price: 0,
    period: "month",
    features: [
      "Basic features",
      "Community support",
      "5 bookings per month",
      "Standard experiences"
    ]
  },
  {
    id: "premium",
    name: "Premium",
    price: 29.99,
    period: "month",
    features: [
      "All Standard features",
      "Priority support",
      "Unlimited bookings",
      "Premium experiences",
      "10% discount on services"
    ],
    popular: true
  },
  {
    id: "elite",
    name: "Elite",
    price: 99.99,
    period: "month",
    features: [
      "All Premium features",
      "Concierge service 24/7",
      "VIP experiences",
      "20% discount on services",
      "Private events access",
      "Free ride credits"
    ]
  }
];

export default function SubscriptionManagementModal({ currentUser, onClose }) {
  const [selectedTier, setSelectedTier] = useState(null);
  const [paymentStep, setPaymentStep] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentSubscription } = useQuery({
    queryKey: ['user-subscription', currentUser.email],
    queryFn: async () => {
      const subs = await base44.entities.UserSubscription.filter({
        user_email: currentUser.email,
        status: "active"
      });
      return subs[0] || null;
    },
    initialData: null
  });

  const subscribeMutation = useMutation({
    mutationFn: async (tier) => {
      // Cancel existing subscription if any
      if (currentSubscription) {
        await base44.entities.UserSubscription.update(currentSubscription.id, {
          status: "cancelled"
        });
      }

      // Create new subscription
      return await base44.entities.UserSubscription.create({
        user_email: currentUser.email,
        tier_name: tier.id,
        price_per_period: tier.price,
        billing_period: tier.period,
        status: "active",
        start_date: new Date().toISOString(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-subscription']);
      setPaymentStep(false);
      alert("Subscription activated successfully!");
      onClose();
    }
  });

  const handleSubscribe = (tier) => {
    if (tier.price === 0) {
      subscribeMutation.mutate(tier);
    } else {
      setSelectedTier(tier);
      setPaymentStep(true);
    }
  };

  const handlePaymentSuccess = () => {
    subscribeMutation.mutate(selectedTier);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-5xl bg-gray-900 rounded-3xl overflow-hidden my-8"
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Subscription Plans</h2>
                {currentSubscription && (
                  <p className="text-white/80 text-sm">
                    Current: {currentSubscription.tier_name}
                  </p>
                )}
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {!paymentStep ? (
              <div className="grid md:grid-cols-3 gap-6">
                {subscriptionTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className={`relative rounded-2xl p-6 border-2 transition ${
                      tier.popular
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/20 bg-white/5"
                    }`}
                  >
                    {tier.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="px-4 py-1 bg-purple-500 rounded-full text-white text-sm font-bold">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <Crown className={`w-12 h-12 mx-auto mb-3 ${
                        tier.popular ? "text-purple-400" : "text-gray-400"
                      }`} />
                      <h3 className="text-white text-2xl font-bold mb-2">{tier.name}</h3>
                      <div className="text-white">
                        <span className="text-4xl font-bold">${tier.price}</span>
                        <span className="text-gray-400">/{tier.period}</span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleSubscribe(tier)}
                      disabled={currentSubscription?.tier_name === tier.id}
                      className={`w-full py-3 ${
                        tier.popular
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      {currentSubscription?.tier_name === tier.id
                        ? "Current Plan"
                        : tier.price === 0
                        ? "Select"
                        : "Subscribe"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="max-w-lg mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-white text-2xl font-bold mb-2">
                    Subscribe to {selectedTier.name}
                  </h3>
                  <p className="text-gray-400">
                    ${selectedTier.price}/{selectedTier.period}
                  </p>
                </div>

                <StripePaymentForm
                  amount={selectedTier.price}
                  referenceType="subscription"
                  referenceId={currentUser.id}
                  description={`${selectedTier.name} subscription`}
                  metadata={{ tier: selectedTier.id }}
                  onSuccess={handlePaymentSuccess}
                  onError={(error) => {
                    console.error("Payment error:", error);
                    alert("Payment failed: " + error.message);
                  }}
                />

                <button
                  onClick={() => setPaymentStep(false)}
                  className="w-full text-gray-400 hover:text-white transition mt-4"
                >
                  ← Back to plans
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
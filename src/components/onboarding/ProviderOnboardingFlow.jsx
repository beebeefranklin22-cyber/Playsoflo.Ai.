import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, ArrowRight, Car, Home, Upload, Shield, 
  DollarSign, Calendar, X, Sparkles, Star, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ProviderOnboardingFlow({ currentUser, providerType, onComplete, onSkip }) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState(null);

  useEffect(() => {
    const loadOnboarding = async () => {
      const existing = await base44.entities.ProviderOnboarding.filter({
        user_email: currentUser.email,
        provider_type: providerType
      });

      if (existing.length > 0) {
        setOnboardingData(existing[0]);
      } else {
        const created = await base44.entities.ProviderOnboarding.create({
          user_email: currentUser.email,
          provider_type: providerType,
          current_step: 'welcome'
        });
        setOnboardingData(created);
      }
    };
    loadOnboarding();
  }, [currentUser, providerType]);

  const steps = providerType === 'car_rental' ? [
    {
      id: 'welcome',
      title: 'Welcome to Fleet Management',
      icon: Car,
      content: 'Earn money by renting out your vehicles. We make it easy with insurance, payments, and customer support.',
      tips: ['Set competitive prices', 'Keep cars well-maintained', 'Respond quickly to bookings']
    },
    {
      id: 'first_listing',
      title: 'Add Your First Vehicle',
      icon: Upload,
      content: 'Start earning by listing your first car. You can add more later or use bulk upload for multiple vehicles.',
      action: 'add_car',
      tips: ['High-quality photos increase bookings', 'Detailed descriptions build trust', 'Accurate pricing attracts renters']
    },
    {
      id: 'verification',
      title: 'Verify Your Identity',
      icon: Shield,
      content: 'Complete verification to unlock instant bookings and higher earning potential. This builds trust with renters.',
      action: 'verify',
      tips: ['Upload driver\'s license', 'Provide insurance info', 'Add vehicle registration']
    },
    {
      id: 'dashboard_tour',
      title: 'Your Dashboard',
      icon: Calendar,
      content: 'Track your earnings, manage bookings, and monitor your fleet performance all in one place.',
      tips: ['Check daily for new bookings', 'Monitor utilization rate', 'Use AI insights for pricing']
    },
    {
      id: 'pricing',
      title: 'Maximize Earnings',
      icon: DollarSign,
      content: 'Use our AI pricing optimizer to set competitive rates and increase your bookings.',
      tips: ['Adjust prices for peak seasons', 'Offer weekly/monthly discounts', 'Monitor competitor pricing']
    }
  ] : [
    {
      id: 'welcome',
      title: 'Welcome to Property Hosting',
      icon: Home,
      content: 'List your property and start earning. We handle payments, guest verification, and booking management.',
      tips: ['Professional photos are key', 'Accurate descriptions matter', 'Competitive pricing wins']
    },
    {
      id: 'first_listing',
      title: 'List Your First Property',
      icon: Upload,
      content: 'Create your first listing and reach thousands of potential guests. Add more properties anytime.',
      action: 'add_property',
      tips: ['Highlight unique amenities', 'Set clear house rules', 'Add all property photos']
    },
    {
      id: 'verification',
      title: 'Become a Verified Host',
      icon: Shield,
      content: 'Verified hosts get more bookings and can charge premium rates. Complete verification to stand out.',
      action: 'verify',
      tips: ['Upload property documents', 'Verify ownership', 'Add insurance details']
    },
    {
      id: 'dashboard_tour',
      title: 'Your Host Dashboard',
      icon: Calendar,
      content: 'Manage bookings, track occupancy, and monitor earnings. Everything you need in one place.',
      tips: ['Check calendar daily', 'Respond to guests quickly', 'Monitor performance metrics']
    },
    {
      id: 'pricing',
      title: 'Optimize Your Pricing',
      icon: DollarSign,
      content: 'Set competitive rates and adjust for demand. Our tools help you maximize revenue.',
      tips: ['Use dynamic pricing', 'Offer discounts for long stays', 'Monitor local market rates']
    }
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      const nextStep = steps[currentStep + 1];
      await base44.entities.ProviderOnboarding.update(onboardingData.id, {
        steps_completed: [...(onboardingData.steps_completed || []), currentStepData.id],
        current_step: nextStep.id
      });
      setCurrentStep(currentStep + 1);
    } else {
      await base44.entities.ProviderOnboarding.update(onboardingData.id, {
        onboarding_completed: true,
        steps_completed: [...(onboardingData.steps_completed || []), currentStepData.id]
      });
      toast.success('🎉 Onboarding completed!');
      onComplete();
    }
  };

  const handleSkip = async () => {
    if (onboardingData) {
      await base44.entities.ProviderOnboarding.update(onboardingData.id, {
        onboarding_completed: true
      });
    }
    onSkip();
  };

  if (!onboardingData) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="w-full max-w-3xl bg-gray-900 rounded-3xl overflow-hidden flex flex-col"
        style={{ height: 'min(90vh, 680px)', maxHeight: '90vh' }}
      >
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Provider Onboarding</h2>
              <p className="text-purple-100">Step {currentStep + 1} of {steps.length}</p>
            </div>
            <button onClick={handleSkip} className="text-white/70 hover:text-white text-sm">
              Skip Tour
            </button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                  <currentStepData.icon className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{currentStepData.title}</h3>
                  <p className="text-gray-400">{currentStepData.content}</p>
                </div>
              </div>

              {/* Tips */}
              <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    <h4 className="text-white font-bold">Pro Tips</h4>
                  </div>
                  <ul className="space-y-2">
                    {currentStepData.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                        <Star className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Action hint */}
              {currentStepData.action && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-300 font-semibold mb-1">Action Required</p>
                      <p className="text-yellow-200 text-sm">
                        {currentStepData.action === 'add_car' && 'Click "Add Vehicle" after completing this tour'}
                        {currentStepData.action === 'add_property' && 'Click "Add Property" after completing this tour'}
                        {currentStepData.action === 'verify' && 'Complete verification in Settings after this tour'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
          </div>

          {/* Sticky navigation footer */}
          <div className="flex-shrink-0 flex gap-4 px-8 pb-8 pt-4 border-t border-white/10 bg-gray-900">
            {currentStep > 0 && (
              <Button
                onClick={() => setCurrentStep(currentStep - 1)}
                variant="outline"
                className="flex-1"
              >
                Previous
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Tour
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
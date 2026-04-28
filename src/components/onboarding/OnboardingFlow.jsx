import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronRight, X, Sparkles, Zap, Target, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

const ONBOARDING_STEPS = [
  {
    id: "welcome",
    title: "Welcome to PlaySoFlo",
    description: "Your all-in-one platform for social, shopping, travel, streaming, and more.",
    icon: Sparkles,
    highlights: ["Connect with friends", "Create & share content", "Buy & sell services"],
    cta: "Let's Get Started",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "social",
    title: "Social & Content Creation",
    description: "Share posts, stories, reels, and go live with your community.",
    icon: Zap,
    features: [
      "📸 Post photos and videos",
      "🎥 Create engaging reels",
      "📱 Share temporary stories",
      "🔴 Go live with followers",
    ],
    actionUrl: "/Home",
    cta: "Explore Social",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "marketplace",
    title: "Marketplace & Services",
    description: "Buy and sell products, services, and experiences from the community.",
    icon: Target,
    features: [
      "🛍️ Browse marketplace",
      "💼 Offer services",
      "🎯 Create product listings",
      "👥 Connect with providers",
    ],
    actionUrl: "/Marketplace",
    cta: "Explore Marketplace",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "features",
    title: "More Features",
    description: "Travel booking, streaming, music, food delivery, inventory management, and more.",
    icon: BookOpen,
    features: [
      "✈️ Book rides & travel",
      "📺 Stream & watch content",
      "🎵 Music & fan pools",
      "🚗 Delivery services",
    ],
    actionUrl: "/Universe",
    cta: "Discover All Features",
    color: "from-orange-500 to-red-500",
  },
];

export default function OnboardingFlow({ currentUser, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const step = ONBOARDING_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await base44.auth.updateMe({ onboarding_completed: true });
      toast.success("Welcome! Onboarding complete.");
      if (onComplete) onComplete();
    } catch (err) {
      toast.error("Failed to complete onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateAndClose = (url) => {
    navigate(createPageUrl(url));
    handleComplete();
  };

  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header with background gradient */}
        <div className={`bg-gradient-to-r ${step.color} p-8 text-white relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-20 blur-xl">
            <Icon className="absolute w-32 h-32 -top-10 -right-10 rotate-45" />
          </div>
          <div className="relative z-10">
            <Icon className="w-12 h-12 mb-4" />
            <h1 className="text-3xl font-bold mb-2">{step.title}</h1>
            <p className="text-white/80">{step.description}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Highlights or Features */}
          {(step.highlights || step.features) && (
            <div className="space-y-3">
              {(step.highlights || step.features).map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3 text-gray-300"
                >
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex-shrink-0" />
                  <span>{item}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Step {currentStep + 1} of {ONBOARDING_STEPS.length}</span>
              <span>{Math.round(((currentStep + 1) / ONBOARDING_STEPS.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{
                  width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-4">
            {step.actionUrl ? (
              <>
                <button
                  onClick={() => handleNavigateAndClose(step.actionUrl.replace("/", ""))}
                  disabled={isLoading}
                  className={`w-full py-3 bg-gradient-to-r ${step.color} text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      {step.cta}
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  onClick={handleNext}
                  disabled={isLoading}
                  className="w-full py-2 text-gray-400 hover:text-white transition font-medium"
                >
                  {currentStep === ONBOARDING_STEPS.length - 1 ? "Skip" : "Next Step"}
                </button>
              </>
            ) : (
              <button
                onClick={handleNext}
                disabled={isLoading}
                className={`w-full py-3 bg-gradient-to-r ${step.color} text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    {currentStep === ONBOARDING_STEPS.length - 1 ? "Finish" : "Next Step"}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Skip for later */}
          <button
            onClick={handleComplete}
            disabled={isLoading}
            className="w-full text-xs text-gray-500 hover:text-gray-400 transition text-center disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={handleComplete}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </motion.div>
    </motion.div>
  );
}
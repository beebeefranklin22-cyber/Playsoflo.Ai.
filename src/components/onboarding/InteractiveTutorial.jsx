import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function InteractiveTutorial({ feature, onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const [highlightElement, setHighlightElement] = useState(null);

  const tutorials = {
    wallet: [
      {
        title: "Your Digital Wallet",
        description: "Store money, manage crypto, and make instant payments",
        target: "[data-tutorial='wallet-balance']",
        action: "Tap your balance to add funds"
      },
      {
        title: "Send & Receive",
        description: "Transfer money to anyone instantly with zero fees",
        target: "[data-tutorial='send-money']",
        action: "Try sending money to a friend"
      }
    ],
    marketplace: [
      {
        title: "Discover Services",
        description: "Find local services, experiences, and rentals",
        target: "[data-tutorial='search-bar']",
        action: "Search for services near you"
      },
      {
        title: "Book & Pay",
        description: "Instant booking with secure escrow protection",
        target: "[data-tutorial='book-button']",
        action: "Tap any service to book"
      }
    ],
    social: [
      {
        title: "Share Your Lifestyle",
        description: "Post experiences, connect with others, and earn rewards",
        target: "[data-tutorial='create-post']",
        action: "Create your first post"
      },
      {
        title: "Build Your Network",
        description: "Follow friends and discover interesting people",
        target: "[data-tutorial='friend-finder']",
        action: "Find people to follow"
      }
    ]
  };

  const currentTutorial = tutorials[feature] || [];
  const currentTutorialStep = currentTutorial[step];

  useEffect(() => {
    if (currentTutorialStep?.target) {
      const element = document.querySelector(currentTutorialStep.target);
      if (element) {
        setHighlightElement(element.getBoundingClientRect());
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [step, currentTutorialStep]);

  const handleNext = () => {
    if (step < currentTutorial.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  if (!currentTutorialStep) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200]">
        {/* Overlay with spotlight */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        
        {/* Spotlight on target element */}
        {highlightElement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute',
              left: highlightElement.left - 8,
              top: highlightElement.top - 8,
              width: highlightElement.width + 16,
              height: highlightElement.height + 16,
              borderRadius: '12px',
              boxShadow: '0 0 0 4px rgba(168, 85, 247, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.8)',
              pointerEvents: 'none'
            }}
          />
        )}

        {/* Tutorial Card */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md mx-4"
        >
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-6 rounded-3xl shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{currentTutorialStep.title}</h3>
                  <p className="text-purple-100 text-sm">Step {step + 1} of {currentTutorial.length}</p>
                </div>
              </div>
              <button onClick={onSkip} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-white mb-4">{currentTutorialStep.description}</p>
            
            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <p className="text-purple-100 text-sm">
                👉 {currentTutorialStep.action}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={onSkip}
                variant="outline"
                className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Skip Tutorial
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 bg-white text-purple-600 hover:bg-gray-100"
              >
                {step < currentTutorial.length - 1 ? 'Next' : 'Got It!'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
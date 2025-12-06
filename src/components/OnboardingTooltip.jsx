import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OnboardingTooltip({ 
  target, 
  title, 
  description, 
  position = "bottom",
  onNext,
  onDismiss,
  stepNumber,
  totalSteps
}) {
  const [show, setShow] = useState(true);

  const handleNext = () => {
    setShow(false);
    setTimeout(() => {
      if (onNext) onNext();
    }, 300);
  };

  const handleDismiss = () => {
    setShow(false);
    if (onDismiss) onDismiss();
  };

  const positionClasses = {
    top: "-top-2 left-1/2 -translate-x-1/2 -translate-y-full mb-2",
    bottom: "-bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-2",
    left: "top-1/2 -left-2 -translate-y-1/2 -translate-x-full mr-2",
    right: "top-1/2 -right-2 -translate-y-1/2 translate-x-full ml-2"
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`absolute ${positionClasses[position]} z-[9999] w-80`}
        >
          {/* Spotlight effect */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-xl animate-pulse" />
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-4 rounded-2xl shadow-2xl border border-white/20">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-white" />
                </div>
                <span className="text-white text-sm font-medium">
                  Step {stepNumber} of {totalSteps}
                </span>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded-full transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
            <p className="text-white/90 text-sm mb-4">{description}</p>

            <div className="flex gap-2">
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="flex-1 text-white hover:bg-white/20"
              >
                Skip Tour
              </Button>
              <Button
                onClick={handleNext}
                size="sm"
                className="flex-1 bg-white text-purple-600 hover:bg-white/90"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Arrow pointer */}
          <div className={`absolute w-0 h-0 ${
            position === "bottom" ? "bottom-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-purple-600" :
            position === "top" ? "top-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-purple-600" :
            position === "right" ? "right-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-purple-600" :
            "left-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-purple-600"
          }`} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
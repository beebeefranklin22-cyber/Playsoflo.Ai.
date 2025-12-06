import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  X, ArrowRight, ArrowLeft, CheckCircle, RotateCcw 
} from "lucide-react";

export default function InteractiveGuide({ 
  steps,
  onComplete,
  onDismiss,
  title = "Interactive Guide"
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCompleted(true);
      if (onComplete) onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setCompleted(false);
  };

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-3xl"
      >
        <Card className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 border-white/20">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <button
                onClick={onDismiss}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!completed ? (
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Step Icon */}
                  {step.icon && (
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                      <step.icon className="w-10 h-10 text-white" />
                    </div>
                  )}

                  {/* Step Content */}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-gray-300 text-lg mb-6">{step.description}</p>
                  </div>

                  {/* Interactive Demo */}
                  {step.demo && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      {step.demo}
                    </div>
                  )}

                  {/* Tips */}
                  {step.tips && step.tips.length > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        💡 Pro Tips
                      </h4>
                      <ul className="space-y-2">
                        {step.tips.map((tip, idx) => (
                          <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handlePrevious}
                      disabled={currentStep === 0}
                      variant="outline"
                      className="flex-1"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {currentStep < steps.length - 1 ? "Next" : "Complete"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="completed"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-3">Guide Complete!</h3>
                  <p className="text-gray-300 text-lg mb-8">
                    You're now ready to make the most of this feature
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleRestart}
                      variant="outline"
                      className="flex-1"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restart Guide
                    </Button>
                    <Button
                      onClick={onDismiss}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      Get Started
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
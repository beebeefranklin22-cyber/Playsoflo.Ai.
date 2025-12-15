import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function FeatureTooltip({ 
  id, 
  title, 
  description, 
  position = "top",
  children,
  currentUser 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = async () => {
    setIsDismissed(true);
    setIsVisible(false);
    
    if (currentUser) {
      try {
        const onboarding = await base44.entities.ProviderOnboarding.filter({
          user_email: currentUser.email
        });
        
        if (onboarding[0]) {
          await base44.entities.ProviderOnboarding.update(onboarding[0].id, {
            tooltips_dismissed: [...(onboarding[0].tooltips_dismissed || []), id]
          });
        }
      } catch (err) {
        console.log('Failed to save tooltip dismissal:', err);
      }
    }
  };

  if (isDismissed) return children;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block">
      <div 
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute z-[200] ${positionClasses[position]} w-80`}
          >
            <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-4 shadow-2xl">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Info className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold mb-1">{title}</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{description}</p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1 hover:bg-white/10 rounded transition flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <button
                onClick={handleDismiss}
                className="text-purple-400 text-xs hover:underline"
              >
                Got it, don't show again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
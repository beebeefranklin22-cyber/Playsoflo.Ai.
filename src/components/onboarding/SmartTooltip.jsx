import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SmartTooltip({ currentUser, currentPage }) {
  const [tooltip, setTooltip] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    if (!currentUser) return;

    const getPageTooltip = async () => {
      // Don't show if user has seen it
      const tooltipKey = `${currentPage}_tooltip`;
      const userDismissed = currentUser.dismissed_tooltips || [];
      if (userDismissed.includes(tooltipKey) || dismissed.has(tooltipKey)) {
        return;
      }

      // Get AI-generated contextual tip
      try {
        const aiTip = await base44.integrations.Core.InvokeLLM({
          prompt: `User ${currentUser.full_name} is on the ${currentPage} page.
User interests: ${currentUser.interests?.join(', ') || 'Not set'}
User's primary use: ${currentUser.primary_use || 'General'}

Give ONE specific, actionable tip for what they should try on this page.
Make it personalized, exciting, and under 100 characters.
Format: Just the tip text, no quotes or formatting.`,
          add_context_from_internet: false
        });

        setTooltip({
          key: tooltipKey,
          message: aiTip
        });
      } catch (error) {
        console.error('Tooltip generation error:', error);
      }
    };

    // Show tooltip after 2 seconds
    const timeout = setTimeout(getPageTooltip, 2000);
    return () => clearTimeout(timeout);
  }, [currentPage, currentUser]);

  const handleDismiss = async () => {
    if (!tooltip) return;
    
    setDismissed(prev => new Set(prev).add(tooltip.key));
    setTooltip(null);

    // Save to user profile
    try {
      const userDismissed = currentUser.dismissed_tooltips || [];
      await base44.auth.updateMe({
        dismissed_tooltips: [...userDismissed, tooltip.key]
      });
    } catch (error) {
      console.error('Failed to save tooltip state:', error);
    }
  };

  return (
    <AnimatePresence>
      {tooltip && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 max-w-md mx-4"
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-medium">{tooltip.message}</p>
              </div>
              <button onClick={handleDismiss} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
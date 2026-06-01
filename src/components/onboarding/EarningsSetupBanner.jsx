import React, { useState } from "react";
import { DollarSign, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import EarningsSetupWizard from "./EarningsSetupWizard";

/**
 * A dismissable banner that appears on the Home page for users who
 * are drivers, providers, creators, etc. but haven't completed
 * their earnings/payout onboarding yet.
 */
export default function EarningsSetupBanner({ currentUser }) {
  const [dismissed, setDismissed] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Only show for earner roles who haven't completed setup
  const isEarner = currentUser?.is_driver || currentUser?.is_provider ||
    currentUser?.is_creator || currentUser?.is_restaurant_owner ||
    currentUser?.is_delivery_driver || currentUser?.is_host;

  const hasCompletedSetup = currentUser?.earnings_onboarding_completed || currentUser?.stripe_account_id;

  if (!isEarner || hasCompletedSetup || dismissed) return null;

  return (
    <>
      <div className="mx-4 mt-3 mb-1 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-600/15 to-green-700/10 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-5 h-5 text-emerald-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">Set up your payouts</p>
          <p className="text-gray-300 text-xs">Connect your bank to start getting paid for your work.</p>
        </div>
        <Button
          onClick={() => setShowWizard(true)}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
        >
          Set Up <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
        <button onClick={() => setDismissed(true)} className="text-gray-500 hover:text-gray-300 flex-shrink-0 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {showWizard && (
        <EarningsSetupWizard
          currentUser={currentUser}
          onClose={() => setShowWizard(false)}
          onComplete={() => setShowWizard(false)}
        />
      )}
    </>
  );
}
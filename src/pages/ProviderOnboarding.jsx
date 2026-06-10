import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, ChevronRight, Building2, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ProviderOnboardingFlow from "@/components/onboarding/ProviderOnboardingFlow";
import { PROVIDER_CATEGORIES } from "@/components/onboarding/providerCategoryConfig";

export default function ProviderOnboarding() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFlow, setShowFlow] = useState(false);
  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        // Load existing marketplace items as "businesses" this provider owns
        const items = await base44.entities.MarketplaceItem.filter({ provider_email: user.email });
        // Group by category to represent "businesses"
        const grouped = {};
        items.forEach((item) => {
          const key = item.category || "other";
          if (!grouped[key]) grouped[key] = { category: key, items: [], latestTitle: item.title };
          grouped[key].items.push(item);
        });
        setBusinesses(Object.values(grouped));

        // Auto-open flow for brand-new providers
        if (!user.provider_onboarding_completed && !user.is_provider) {
          setShowFlow(true);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleComplete = async () => {
    setShowFlow(false);
    const updated = await base44.auth.me();
    setCurrentUser(updated);
    navigate(createPageUrl("ProviderHub"));
  };

  const handleSkip = () => {
    setShowFlow(false);
    navigate(createPageUrl("ProviderHub"));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full mb-4">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-purple-300 text-sm font-medium">Provider Hub</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {currentUser?.provider_onboarding_completed ? "My Businesses" : "Start Your Provider Journey"}
        </h1>
        <p className="text-gray-400 text-sm">
          {currentUser?.provider_onboarding_completed
            ? "Manage your existing businesses or add a new one."
            : "Set up your first service and start earning on PlaySoFlo."}
        </p>
      </div>

      {/* Existing businesses */}
      {businesses.length > 0 && (
        <div className="mb-8">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">Your Businesses</p>
          <div className="space-y-3">
            {businesses.map((biz) => {
              const catConfig = PROVIDER_CATEGORIES.find((c) => c.marketplaceCategory === biz.category || c.id === biz.category);
              return (
                <motion.button
                  key={biz.category}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => navigate(createPageUrl("ProviderHub"))}
                  className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-purple-500/40 transition text-left"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${catConfig?.color || "from-gray-600 to-gray-700"} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {catConfig?.emoji || "🏢"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{catConfig?.label || biz.category}</p>
                    <p className="text-gray-400 text-sm">{biz.items.length} listing{biz.items.length !== 1 ? "s" : ""} · {biz.latestTitle}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA to add another business */}
      <button
        onClick={() => setShowFlow(true)}
        className="w-full flex items-center gap-4 p-5 border-2 border-dashed border-purple-500/30 rounded-2xl hover:border-purple-500/60 hover:bg-purple-500/5 transition group"
      >
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition">
          <Plus className="w-6 h-6 text-purple-400" />
        </div>
        <div className="text-left">
          <p className="text-white font-semibold">
            {businesses.length > 0 ? "Add Another Business" : "Set Up Your First Business"}
          </p>
          <p className="text-gray-400 text-sm">Guided setup tailored to your service category</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-500 ml-auto" />
      </button>

      {/* Category browse */}
      <div className="mt-10">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-4">Available Categories</p>
        <div className="grid grid-cols-3 gap-3">
          {PROVIDER_CATEGORIES.map((cat) => {
            const owned = businesses.some((b) => b.category === cat.marketplaceCategory || b.category === cat.id);
            return (
              <div
                key={cat.id}
                className={`p-3 rounded-2xl border text-center ${
                  owned ? "border-green-500/40 bg-green-500/10" : "border-white/10 bg-white/5"
                }`}
              >
                <div className="text-2xl mb-1">{cat.emoji}</div>
                <p className="text-white text-xs font-medium leading-tight">{cat.label}</p>
                {owned && <p className="text-green-400 text-[10px] mt-1 flex items-center justify-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Active</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Onboarding Flow Modal */}
      <AnimatePresence>
        {showFlow && currentUser && (
          <ProviderOnboardingFlow
            currentUser={currentUser}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
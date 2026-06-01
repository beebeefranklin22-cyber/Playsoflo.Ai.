import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import {
  X, CheckCircle, Loader2, CreditCard, ShieldCheck,
  ArrowRight, ArrowLeft, ExternalLink, AlertCircle, Circle,
  Car, Briefcase, Video, Store, Truck, Home,
  Zap, Calendar, Clock, DollarSign, Sparkles,
  Building2, BadgeCheck
} from "lucide-react";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  { id: "driver", label: "Driver", desc: "Give rides & earn per trip", icon: Car, color: "from-blue-500 to-cyan-500" },
  { id: "provider", label: "Service Provider", desc: "Offer services & get booked", icon: Briefcase, color: "from-purple-500 to-pink-500" },
  { id: "creator", label: "Content Creator", desc: "Monetize videos, streams & tips", icon: Video, color: "from-pink-500 to-rose-500" },
  { id: "restaurant", label: "Restaurant Owner", desc: "Sell food & take orders", icon: Store, color: "from-orange-500 to-red-500" },
  { id: "delivery", label: "Delivery Driver", desc: "Deliver food & packages", icon: Truck, color: "from-green-500 to-emerald-500" },
  { id: "host", label: "Property Host", desc: "Rent properties & earn", icon: Home, color: "from-yellow-500 to-amber-500" },
];

const PAYOUT_SCHEDULES = [
  { id: "instant", label: "Instant", desc: "$0.50 per cashout", icon: Zap, color: "text-yellow-400" },
  { id: "daily", label: "Daily", desc: "Free · Every morning", icon: Clock, color: "text-blue-400" },
  { id: "weekly", label: "Weekly", desc: "Free · Every Monday", icon: Calendar, color: "text-purple-400" },
];

export default function EarningsSetupWizard({ currentUser, onClose, onComplete }) {
  const [step, setStep] = useState(0);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [payoutSchedule, setPayoutSchedule] = useState("daily");
  const [working, setWorking] = useState(false);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [checkingStripe, setCheckingStripe] = useState(false);

  const hasStripe = !!currentUser?.stripe_account_id;
  const isStripeReady = stripeStatus?.charges_enabled && stripeStatus?.payouts_enabled;

  // Pre-select roles based on user flags
  useEffect(() => {
    const roles = [];
    if (currentUser?.is_driver) roles.push("driver");
    if (currentUser?.is_provider) roles.push("provider");
    if (currentUser?.is_creator) roles.push("creator");
    if (currentUser?.is_restaurant_owner) roles.push("restaurant");
    if (currentUser?.is_delivery_driver) roles.push("delivery");
    if (selectedRoles.length === 0 && roles.length > 0) setSelectedRoles(roles);
  }, [currentUser]);

  // Check Stripe status if already connected
  useEffect(() => {
    if (hasStripe) checkStripeStatus();
  }, []);

  const checkStripeStatus = async () => {
    if (!currentUser?.stripe_account_id) return;
    setCheckingStripe(true);
    try {
      const res = await base44.functions.invoke("getAccountStatus", {
        account_id: currentUser.stripe_account_id,
      });
      setStripeStatus(res.data);
    } catch {}
    setCheckingStripe(false);
  };

  const toggleRole = (roleId) => {
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  const saveRoles = async () => {
    const flags = {};
    if (selectedRoles.includes("driver")) flags.is_driver = true;
    if (selectedRoles.includes("provider")) flags.is_provider = true;
    if (selectedRoles.includes("creator")) flags.is_creator = true;
    if (selectedRoles.includes("restaurant")) flags.is_restaurant_owner = true;
    if (selectedRoles.includes("delivery")) flags.is_delivery_driver = true;
    if (selectedRoles.includes("host")) flags.is_host = true;
    await base44.auth.updateMe(flags);
  };

  const connectStripe = async () => {
    setWorking(true);
    try {
      if (hasStripe) {
        // Continue existing onboarding
        const linkRes = await base44.functions.invoke("createAccountLink", {
          account_id: currentUser.stripe_account_id,
          return_url: `${window.location.origin}${createPageUrl("Profile")}?stripe=success`,
          refresh_url: `${window.location.origin}${createPageUrl("Profile")}?stripe=refresh`,
        });
        if (linkRes.data?.url) window.location.href = linkRes.data.url;
      } else {
        // Create new account
        const accountRes = await base44.functions.invoke("createConnectedAccount", {
          email: currentUser.email,
          country: "US",
        });
        const accountId = accountRes.data?.account_id || accountRes.data?.accountId;
        if (!accountId) throw new Error("No account returned");

        await base44.auth.updateMe({ stripe_account_id: accountId });

        const linkRes = await base44.functions.invoke("createAccountLink", {
          account_id: accountId,
          return_url: `${window.location.origin}${createPageUrl("Profile")}?stripe=success`,
          refresh_url: `${window.location.origin}${createPageUrl("Profile")}?stripe=refresh`,
        });
        if (linkRes.data?.url) window.location.href = linkRes.data.url;
      }
    } catch (e) {
      toast.error("Setup failed: " + (e?.message || "Please try again"));
      setWorking(false);
    }
  };

  const finishSetup = async () => {
    setWorking(true);
    try {
      await saveRoles();
      await base44.auth.updateMe({
        payout_schedule: payoutSchedule,
        earnings_onboarding_completed: true,
      });
      toast.success("You're all set to start earning!");
      onComplete?.();
      onClose();
    } catch (e) {
      toast.error("Could not save: " + (e?.message || "Try again"));
    }
    setWorking(false);
  };

  const TOTAL_STEPS = 4;

  const slideAnim = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
    transition: { type: "spring", stiffness: 350, damping: 30 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Get Paid Setup</h2>
              <p className="text-emerald-100 text-xs">Set up payments in under 3 minutes</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 bg-white/5">
          <div className="flex items-center gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                  i <= step ? "bg-emerald-500" : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <p className="text-gray-400 text-xs mt-2">Step {step + 1} of {TOTAL_STEPS}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* STEP 0 — Choose Roles */}
            {step === 0 && (
              <motion.div key="roles" {...slideAnim}>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-white font-bold text-lg">How will you earn?</h3>
                </div>
                <p className="text-gray-400 text-sm mb-5">Select all that apply — you can change this later.</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {ROLE_OPTIONS.map((role) => {
                    const selected = selectedRoles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        onClick={() => toggleRole(role.id)}
                        className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                          selected
                            ? "border-emerald-500 bg-emerald-500/10 scale-[1.02]"
                            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                        }`}
                      >
                        {selected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-2`}>
                          <role.icon className="w-4.5 h-4.5 text-white" />
                        </div>
                        <p className="text-white text-sm font-semibold">{role.label}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{role.desc}</p>
                      </button>
                    );
                  })}
                </div>
                <Button
                  onClick={() => setStep(1)}
                  disabled={selectedRoles.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[48px]"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* STEP 1 — Stripe Connect */}
            {step === 1 && (
              <motion.div key="stripe" {...slideAnim}>
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-white font-bold text-lg">Connect your bank</h3>
                </div>
                <p className="text-gray-400 text-sm mb-5">
                  We use Stripe — trusted by millions — to send earnings directly to your bank account.
                </p>

                {/* Benefits */}
                <div className="space-y-2 mb-5">
                  {[
                    { icon: ShieldCheck, text: "Bank-level security — we never see your details" },
                    { icon: Building2, text: "Any US bank account or debit card" },
                    { icon: BadgeCheck, text: "Just need your ID — takes about 2 minutes" },
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <b.icon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-gray-200 text-sm">{b.text}</span>
                    </div>
                  ))}
                </div>

                {/* Status if already connected */}
                {hasStripe && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <StatusPill ok={stripeStatus?.charges_enabled} label="Accept Payments" />
                    <StatusPill ok={stripeStatus?.payouts_enabled} label="Receive Payouts" />
                  </div>
                )}

                {isStripeReady ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-5 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold text-sm">Stripe connected!</p>
                      <p className="text-emerald-200 text-xs">Your bank is ready to receive payouts.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5 text-sm text-gray-300 flex gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                    You'll be redirected to Stripe to verify your identity. After finishing you'll come right back.
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(0)} className="bg-white/5 border-white/20 text-white">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  {isStripeReady ? (
                    <Button onClick={() => setStep(2)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[48px]">
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={connectStripe} disabled={working} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[48px]">
                      {working
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Opening Stripe…</>
                        : hasStripe
                          ? <>Finish Verification <ExternalLink className="w-4 h-4 ml-2" /></>
                          : <>Connect Stripe <ExternalLink className="w-4 h-4 ml-2" /></>
                      }
                    </Button>
                  )}
                </div>

                {/* Skip option */}
                {!isStripeReady && (
                  <button
                    onClick={() => setStep(2)}
                    className="w-full text-center text-gray-500 hover:text-gray-300 text-xs mt-3 transition"
                  >
                    I'll do this later →
                  </button>
                )}
              </motion.div>
            )}

            {/* STEP 2 — Payout Preferences */}
            {step === 2 && (
              <motion.div key="prefs" {...slideAnim}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-white font-bold text-lg">How often do you want to get paid?</h3>
                </div>
                <p className="text-gray-400 text-sm mb-5">Choose your preferred payout schedule.</p>

                <div className="space-y-3 mb-6">
                  {PAYOUT_SCHEDULES.map((sched) => {
                    const selected = payoutSchedule === sched.id;
                    return (
                      <button
                        key={sched.id}
                        onClick={() => setPayoutSchedule(sched.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                          selected
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center`}>
                          <sched.icon className={`w-5 h-5 ${sched.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-semibold">{sched.label}</p>
                          <p className="text-gray-400 text-xs">{sched.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selected ? "border-emerald-500 bg-emerald-500" : "border-white/30"
                        }`}>
                          {selected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Earning info by role */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5">
                  <p className="text-white text-sm font-semibold mb-2">Your earning potential:</p>
                  <div className="space-y-1.5">
                    {selectedRoles.includes("driver") && (
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <Car className="w-3.5 h-3.5 text-blue-400" />
                        <span>Drivers keep <strong className="text-white">88–90%</strong> of every ride + 100% of tips</span>
                      </div>
                    )}
                    {selectedRoles.includes("provider") && (
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                        <span>Providers earn from bookings with <strong className="text-white">low platform fees</strong></span>
                      </div>
                    )}
                    {selectedRoles.includes("creator") && (
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <Video className="w-3.5 h-3.5 text-pink-400" />
                        <span>Creators earn from tips, subscriptions, PPV & digital sales</span>
                      </div>
                    )}
                    {selectedRoles.includes("restaurant") && (
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <Store className="w-3.5 h-3.5 text-orange-400" />
                        <span>Restaurants earn from orders with <strong className="text-white">competitive rates</strong></span>
                      </div>
                    )}
                    {selectedRoles.includes("delivery") && (
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <Truck className="w-3.5 h-3.5 text-green-400" />
                        <span>Delivery drivers earn per delivery + tips</span>
                      </div>
                    )}
                    {selectedRoles.includes("host") && (
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <Home className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Hosts earn from nightly bookings & long-term rentals</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="bg-white/5 border-white/20 text-white">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[48px]">
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Summary & Done */}
            {step === 3 && (
              <motion.div key="done" {...slideAnim}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-9 h-9 text-emerald-400" />
                  </div>
                  <h3 className="text-white font-bold text-xl mb-1">You're ready to earn! 🎉</h3>
                  <p className="text-gray-400 text-sm">Here's a summary of your setup.</p>
                </div>

                {/* Summary cards */}
                <div className="space-y-3 mb-6">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-400 text-xs mb-2">YOUR ROLES</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoles.map((roleId) => {
                        const role = ROLE_OPTIONS.find(r => r.id === roleId);
                        if (!role) return null;
                        return (
                          <span key={roleId} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium">
                            <role.icon className="w-3.5 h-3.5" />
                            {role.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-400 text-xs mb-2">PAYOUT ACCOUNT</p>
                    <div className="flex items-center gap-2">
                      {isStripeReady ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-300 text-sm font-medium">Stripe Connected</span>
                        </>
                      ) : hasStripe ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-300 text-sm font-medium">Verification pending — finish anytime from your Profile</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-400 text-sm">Not connected yet — set up from your Profile when ready</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-400 text-xs mb-2">PAYOUT SCHEDULE</p>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const sched = PAYOUT_SCHEDULES.find(s => s.id === payoutSchedule);
                        return (
                          <>
                            <sched.icon className={`w-4 h-4 ${sched.color}`} />
                            <span className="text-white text-sm font-medium">{sched.label}</span>
                            <span className="text-gray-500 text-xs">· {sched.desc}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="bg-white/5 border-white/20 text-white">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={finishSetup}
                    disabled={working}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[48px]"
                  >
                    {working ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Start Earning"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatusPill({ ok, label }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="flex items-center gap-1.5 mb-0.5">
        {ok ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-amber-400" />}
        <span className="text-white text-xs font-medium">{label}</span>
      </div>
      <p className="text-gray-400 text-[11px]">{ok ? "Ready" : "Pending"}</p>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import {
  X, CheckCircle, Circle, Loader2, CreditCard, ShieldCheck,
  Building2, BadgeCheck, ArrowRight, ExternalLink, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

// Step-by-step Stripe payout setup wizard.
// Walks a provider through: intro → create account → complete onboarding → verified.
export default function StripeSetupWizard({ currentUser, onClose, onConnected }) {
  const [step, setStep] = useState(0);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  const hasAccount = !!currentUser?.stripe_account_id;

  // If they already have an account, jump ahead and check status
  useEffect(() => {
    if (hasAccount) {
      setStep(2);
      refreshStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshStatus = async () => {
    if (!currentUser?.stripe_account_id) return;
    setChecking(true);
    try {
      const res = await base44.functions.invoke("getAccountStatus", {
        account_id: currentUser.stripe_account_id,
      });
      setStatus(res.data);
      if (res.data?.charges_enabled && res.data?.payouts_enabled) {
        setStep(3);
      }
    } catch (e) {
      toast.error("Couldn't check status: " + (e?.message || "try again"));
    } finally {
      setChecking(false);
    }
  };

  const createAccount = async () => {
    setWorking(true);
    try {
      const accountRes = await base44.functions.invoke("createConnectedAccount", {
        email: currentUser.email,
        country: "US",
      });
      const accountId = accountRes.data?.account_id || accountRes.data?.accountId;
      if (!accountId) throw new Error("No account returned");

      const linkRes = await base44.functions.invoke("createAccountLink", {
        account_id: accountId,
        return_url: `${window.location.origin}${createPageUrl("Profile")}?stripe=success`,
        refresh_url: `${window.location.origin}${createPageUrl("Profile")}?stripe=refresh`,
      });
      if (!linkRes.data?.url) throw new Error("No onboarding link returned");
      window.location.href = linkRes.data.url;
    } catch (e) {
      toast.error("Setup failed: " + (e?.message || "Please try again"));
      setWorking(false);
    }
  };

  const continueOnboarding = async () => {
    setWorking(true);
    try {
      const linkRes = await base44.functions.invoke("createAccountLink", {
        account_id: currentUser.stripe_account_id,
        return_url: `${window.location.origin}${createPageUrl("Profile")}?stripe=success`,
        refresh_url: `${window.location.origin}${createPageUrl("Profile")}?stripe=refresh`,
      });
      if (!linkRes.data?.url) throw new Error("No onboarding link returned");
      window.location.href = linkRes.data.url;
    } catch (e) {
      toast.error("Couldn't continue: " + (e?.message || "Please try again"));
      setWorking(false);
    }
  };

  const steps = [
    { label: "Welcome", icon: ShieldCheck },
    { label: "Create Account", icon: Building2 },
    { label: "Verify Details", icon: BadgeCheck },
    { label: "Done", icon: CheckCircle },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Payout Setup</h2>
              <p className="text-emerald-100 text-xs">Get paid for your sales & bookings</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/5">
          {steps.map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                  i < step ? "bg-emerald-500" : i === step ? "bg-emerald-500/30 border-2 border-emerald-400" : "bg-white/10"
                }`}>
                  {i < step
                    ? <CheckCircle className="w-5 h-5 text-white" />
                    : <s.icon className={`w-4 h-4 ${i === step ? "text-emerald-300" : "text-gray-500"}`} />}
                </div>
                <span className={`text-[10px] ${i <= step ? "text-white" : "text-gray-500"}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < step ? "bg-emerald-500" : "bg-white/10"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* STEP 0 — Welcome */}
            {step === 0 && (
              <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-white font-bold text-xl mb-2">Let's get you paid 💸</h3>
                <p className="text-gray-300 text-sm mb-4">
                  We use Stripe — the same secure platform trusted by millions of businesses — to send your earnings straight to your bank.
                </p>
                <div className="space-y-3 mb-6">
                  {[
                    { icon: ShieldCheck, text: "Bank-level security, your details are never stored by us" },
                    { icon: Building2, text: "Connect any US bank account or debit card" },
                    { icon: BadgeCheck, text: "Takes about 2 minutes — just have your ID handy" },
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <b.icon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-gray-200 text-sm">{b.text}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={() => setStep(1)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[48px]">
                  Get Started <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* STEP 1 — Create account */}
            {step === 1 && (
              <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-white font-bold text-xl mb-2">Create your payout account</h3>
                <p className="text-gray-300 text-sm mb-4">
                  We'll create a secure Stripe account linked to <strong className="text-white">{currentUser?.email}</strong>, then take you to Stripe to verify your identity and bank.
                </p>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 text-sm text-emerald-200 flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  You'll be redirected to Stripe. After finishing, you'll come right back here automatically.
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(0)} className="bg-white/5 border-white/20 text-white">Back</Button>
                  <Button onClick={createAccount} disabled={working} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[48px]">
                    {working ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Opening Stripe…</> : <>Continue to Stripe <ExternalLink className="w-4 h-4 ml-2" /></>}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — Verify / pending */}
            {step === 2 && (
              <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-white font-bold text-xl mb-2">Finish verifying</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Your account exists but Stripe still needs a few details before you can receive payouts.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <StatusPill ok={status?.charges_enabled} label="Accept Payments" />
                  <StatusPill ok={status?.payouts_enabled} label="Receive Payouts" />
                </div>
                {status?.requirements?.currently_due?.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 text-xs text-amber-200">
                    Still needed: {status.requirements.currently_due.join(", ").replace(/_/g, " ")}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={refreshStatus} disabled={checking} className="bg-white/5 border-white/20 text-white">
                    {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
                  </Button>
                  <Button onClick={continueOnboarding} disabled={working} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold min-h-[48px]">
                    {working ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Opening…</> : <>Complete Verification <ExternalLink className="w-4 h-4 ml-2" /></>}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Done */}
            {step === 3 && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-9 h-9 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">You're all set! 🎉</h3>
                <p className="text-gray-300 text-sm mb-6">
                  Your payout account is active. Earnings from sales, bookings, and rides will be sent to your bank automatically.
                </p>
                <Button onClick={() => { onConnected?.(); onClose(); }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[48px]">
                  Done
                </Button>
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
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import {
  CreditCard, CheckCircle, AlertCircle, Loader2, ExternalLink,
  ArrowRight, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import StripeSetupWizard from "./StripeSetupWizard";

// A clean, self-contained card that lets any user connect Stripe for payouts
// directly from their profile — no need to dig into the Business Hub.
export default function StripePayoutCard({ currentUser }) {
  const [connecting, setConnecting] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const hasAccount = !!currentUser?.stripe_account_id;

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["profile-stripe-status", currentUser?.stripe_account_id],
    queryFn: async () => {
      if (!currentUser?.stripe_account_id) return null;
      const res = await base44.functions.invoke("getAccountStatus", {
        account_id: currentUser.stripe_account_id,
      });
      return res.data;
    },
    enabled: hasAccount,
    refetchInterval: 60000,
  });

  const isReady = status?.charges_enabled && status?.payouts_enabled;

  const connectMutation = useMutation({
    mutationFn: async () => {
      const accountRes = await base44.functions.invoke("createConnectedAccount", {
        email: currentUser.email,
        businessName:
          currentUser.provider_business_name || currentUser.full_name || currentUser.email,
        country: "US",
      });
      const accountId = accountRes.data.accountId;
      await base44.auth.updateMe({ stripe_account_id: accountId });

      const linkRes = await base44.functions.invoke("createAccountLink", {
        accountId,
        returnUrl: `${window.location.origin}${createPageUrl("Profile")}?stripe=success`,
        refreshUrl: `${window.location.origin}${createPageUrl("Profile")}?stripe=refresh`,
      });
      window.location.href = linkRes.data.url;
    },
    onError: (err) => {
      toast.error("Couldn't start setup: " + (err?.message || "Please try again"));
      setConnecting(false);
    },
  });

  const finishSetup = useMutation({
    mutationFn: async () => {
      const linkRes = await base44.functions.invoke("createAccountLink", {
        accountId: currentUser.stripe_account_id,
        returnUrl: `${window.location.origin}${createPageUrl("Profile")}?stripe=success`,
        refreshUrl: `${window.location.origin}${createPageUrl("Profile")}?stripe=refresh`,
      });
      window.location.href = linkRes.data.url;
    },
    onError: (err) => toast.error("Couldn't continue setup: " + (err?.message || "Try again")),
  });

  const openDashboard = async () => {
    setOpeningDashboard(true);
    try {
      const res = await base44.functions.invoke("createStripeDashboardLink", {
        account_id: currentUser.stripe_account_id,
      });
      if (res.data?.url) window.open(res.data.url, "_blank");
    } catch (e) {
      toast.error("Couldn't open dashboard: " + (e?.message || "Try again"));
    } finally {
      setOpeningDashboard(false);
    }
  };

  // ── Not connected yet ──────────────────────────────────────────────
  if (!hasAccount) {
    return (
      <>
      {showWizard && (
        <StripeSetupWizard
          currentUser={currentUser}
          onClose={() => setShowWizard(false)}
          onConnected={() => refetch()}
        />
      )}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-600/15 to-green-700/10 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold">Set Up Payments & Payouts</h3>
            <p className="text-gray-300 text-sm mt-0.5">
              Connect with Stripe to accept payments and get paid for services, products, rides, and rentals.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-200/80 mb-4">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          Bank-level secure · Takes about 2 minutes · No monthly fees
        </div>
        <Button
          onClick={() => setShowWizard(true)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[48px]"
        >
          Start Setup<ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      </>
    );
  }

  // ── Connected — loading status ─────────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
        <span className="text-gray-300 text-sm">Checking your payout account…</span>
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────
  return (
    <>
    {showWizard && (
      <StripeSetupWizard
        currentUser={currentUser}
        onClose={() => setShowWizard(false)}
        onConnected={() => refetch()}
      />
    )}
    <div
      className={`rounded-2xl border p-5 ${
        isReady
          ? "border-emerald-500/30 bg-gradient-to-br from-emerald-600/15 to-green-700/10"
          : "border-amber-500/30 bg-gradient-to-br from-amber-600/15 to-orange-700/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isReady ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
            <CreditCard className={`w-5 h-5 ${isReady ? "text-emerald-300" : "text-amber-300"}`} />
          </div>
          <div>
            <h3 className="text-white font-semibold">Payments & Payouts</h3>
            <p className={`text-xs font-medium ${isReady ? "text-emerald-300" : "text-amber-300"}`}>
              {isReady ? "Active — you're ready to get paid" : "A few more steps to finish"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            {status?.charges_enabled
              ? <CheckCircle className="w-4 h-4 text-emerald-400" />
              : <AlertCircle className="w-4 h-4 text-amber-400" />}
            <span className="text-white text-xs font-medium">Accept Payments</span>
          </div>
          <p className="text-gray-400 text-[11px]">
            {status?.charges_enabled ? "Ready" : "Setup needed"}
          </p>
        </div>
        <div className="rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            {status?.payouts_enabled
              ? <CheckCircle className="w-4 h-4 text-emerald-400" />
              : <AlertCircle className="w-4 h-4 text-amber-400" />}
            <span className="text-white text-xs font-medium">Receive Payouts</span>
          </div>
          <p className="text-gray-400 text-[11px]">
            {status?.payouts_enabled ? "Enabled" : "Verification needed"}
          </p>
        </div>
      </div>

      {!isReady ? (
        <Button
          onClick={() => setShowWizard(true)}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold min-h-[44px]"
        >
          Finish Setup<ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            onClick={openDashboard}
            disabled={openingDashboard}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {openingDashboard
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Opening…</>
              : <><ExternalLink className="w-4 h-4 mr-2" />Stripe Dashboard</>}
          </Button>
          <Button variant="outline" onClick={() => refetch()} className="bg-white/5 border-white/20 text-white">
            Refresh
          </Button>
        </div>
      )}
    </div>
    </>
  );
}
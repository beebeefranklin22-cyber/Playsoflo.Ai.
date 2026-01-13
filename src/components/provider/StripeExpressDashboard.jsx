import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ExternalLink, CreditCard, DollarSign, TrendingUp, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function StripeExpressDashboard({ currentUser }) {
  const [generatingLink, setGeneratingLink] = useState(false);

  const { data: accountStatus, isLoading, refetch } = useQuery({
    queryKey: ['stripe-account-status', currentUser?.stripe_account_id],
    queryFn: async () => {
      if (!currentUser?.stripe_account_id) return null;
      const response = await base44.functions.invoke('getAccountStatus', {
        account_id: currentUser.stripe_account_id
      });
      return response.data;
    },
    enabled: !!currentUser?.stripe_account_id,
    refetchInterval: 60000 // Refresh every minute
  });

  const openExpressDashboard = async () => {
    if (!currentUser?.stripe_account_id) {
      toast.error('No Stripe account connected');
      return;
    }

    setGeneratingLink(true);
    try {
      // Create login link for Stripe Express Dashboard
      const response = await base44.functions.invoke('createStripeDashboardLink', {
        account_id: currentUser.stripe_account_id
      });
      
      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (error) {
      toast.error('Failed to open dashboard: ' + error.message);
    } finally {
      setGeneratingLink(false);
    }
  };

  if (!currentUser?.stripe_account_id) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 text-purple-400 mx-auto mb-3 animate-spin" />
          <p className="text-gray-400">Loading payout account...</p>
        </CardContent>
      </Card>
    );
  }

  const isFullySetup = accountStatus?.charges_enabled && accountStatus?.payouts_enabled;

  return (
    <div className="space-y-4">
      <Card className={`bg-gradient-to-r ${
        isFullySetup
          ? 'from-green-600/20 to-emerald-600/20 border-green-500/30'
          : 'from-yellow-600/20 to-orange-600/20 border-yellow-500/30'
      }`}>
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Stripe Payout Account
            </span>
            <Badge className={isFullySetup
              ? 'bg-green-500/30 text-green-300'
              : 'bg-yellow-500/30 text-yellow-300'
            }>
              {isFullySetup ? 'Active' : accountStatus?.status || 'Pending'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {accountStatus?.charges_enabled ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                )}
                <span className="text-white font-semibold">Accept Payments</span>
              </div>
              <p className="text-gray-300 text-sm">
                {accountStatus?.charges_enabled ? 'Ready to receive payments' : 'Setup required'}
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {accountStatus?.payouts_enabled ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                )}
                <span className="text-white font-semibold">Receive Payouts</span>
              </div>
              <p className="text-gray-300 text-sm">
                {accountStatus?.payouts_enabled ? 'Payouts enabled' : 'Verification needed'}
              </p>
            </div>
          </div>

          {!isFullySetup && accountStatus?.next_action && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-300 text-sm">
                <strong>Action Required:</strong> {accountStatus.next_action}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={openExpressDashboard}
              disabled={generatingLink}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {generatingLink ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Stripe Dashboard
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="bg-white/5"
            >
              Refresh Status
            </Button>
          </div>

          <p className="text-gray-400 text-xs">
            Access your full Stripe Express Dashboard to view payouts, transaction history, and account settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
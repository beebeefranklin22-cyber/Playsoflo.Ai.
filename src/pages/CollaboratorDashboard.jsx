import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, Music, Calendar, CheckCircle, Clock,
  AlertCircle, ExternalLink, Loader2, ArrowUpRight, Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function CollaboratorDashboard() {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Check for setup completion
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('setup') === 'complete') {
      toast.success('Bank account connected successfully!');
      qc.invalidateQueries(['royalty-earnings']);
      window.history.replaceState({}, '', '/CollaboratorDashboard');
    } else if (params.get('setup') === 'refresh') {
      toast.error('Setup incomplete. Please try again.');
      window.history.replaceState({}, '', '/CollaboratorDashboard');
    }
  }, []);

  const { data: earnings = [], isLoading: loadingEarnings } = useQuery({
    queryKey: ['royalty-earnings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.RoyaltyEarnings.filter({ user_email: currentUser.email });
    },
    enabled: !!currentUser,
  });

  const { data: payouts = [], isLoading: loadingPayouts } = useQuery({
    queryKey: ['royalty-payouts', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.RoyaltyPayout.filter({ user_email: currentUser.email });
    },
    enabled: !!currentUser,
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['user-tracks'],
    queryFn: () => base44.entities.MusicTrack.list(),
    enabled: !!currentUser,
  });

  const connectBankMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('createStripeConnectAccount', {});
      return response.data;
    },
    onSuccess: (data) => {
      window.location.href = data.onboarding_url;
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to connect bank account');
    },
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async (amount) => {
      const response = await base44.functions.invoke('processRoyaltyPayout', { amount });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries(['royalty-earnings']);
      qc.invalidateQueries(['royalty-payouts']);
      setShowPayoutModal(false);
      setPayoutAmount('');
    },
    onError: (error) => {
      if (error.response?.data?.needs_onboarding) {
        toast.error(error.response.data.error);
      } else {
        toast.error(error.message || 'Payout failed');
      }
    },
  });

  const totalAccumulated = earnings.reduce((sum, e) => sum + (e.accumulated_usd || 0), 0);
  const totalLifetime = earnings.reduce((sum, e) => sum + (e.lifetime_earned_usd || 0), 0);
  const totalPaidOut = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount_usd, 0);

  const hasConnectedBank = earnings.some(e => e.payout_enabled || e.stripe_connect_account_id);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Royalty Dashboard</h1>
          <p className="text-gray-400">Track your earnings and manage payouts</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-green-400" />
                <ArrowUpRight className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">${totalAccumulated.toFixed(2)}</p>
              <p className="text-green-400 text-sm">Available for Payout</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">${totalLifetime.toFixed(2)}</p>
              <p className="text-blue-400 text-sm">Lifetime Earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Download className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">${totalPaidOut.toFixed(2)}</p>
              <p className="text-purple-400 text-sm">Total Paid Out</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/20 to-yellow-600/20 border-orange-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Music className="w-8 h-8 text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-white">{earnings.length}</p>
              <p className="text-orange-400 text-sm">Active Tracks</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {!hasConnectedBank ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold mb-2">Connect Bank Account</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Connect your bank account to receive royalty payouts directly.
                    </p>
                    <Button
                      onClick={() => connectBankMutation.mutate()}
                      disabled={connectBankMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {connectBankMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4 mr-2" />
                      )}
                      Connect with Stripe
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold mb-2">Bank Account Connected</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Your bank account is connected and ready for payouts.
                    </p>
                    <Badge className="bg-green-500/20 text-green-400">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold mb-2">Request Payout</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Minimum payout: $1.00 • Available: ${totalAccumulated.toFixed(2)}
                  </p>
                  <Button
                    onClick={() => setShowPayoutModal(true)}
                    disabled={totalAccumulated < 1 || !hasConnectedBank}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Request Payout
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Earnings by Track */}
        <Card className="bg-white/5 border-white/10 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Earnings by Track</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEarnings ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
              </div>
            ) : earnings.length === 0 ? (
              <div className="text-center py-8">
                <Music className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No earnings yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {earnings.map((earning) => {
                  const track = tracks.find(t => t.id === earning.track_id);
                  return (
                    <div key={earning.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Music className="w-10 h-10 text-purple-400" />
                        <div>
                          <h4 className="text-white font-semibold">{track?.title || 'Unknown Track'}</h4>
                          <p className="text-gray-400 text-sm">
                            Lifetime: ${(earning.lifetime_earned_usd || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">
                          ${(earning.accumulated_usd || 0).toFixed(2)}
                        </p>
                        <p className="text-gray-400 text-sm">Unpaid</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPayouts ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
              </div>
            ) : payouts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No payout history</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payouts.map((payout) => (
                  <div key={payout.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {payout.status === 'paid' ? (
                        <CheckCircle className="w-8 h-8 text-green-400" />
                      ) : payout.status === 'processing' ? (
                        <Clock className="w-8 h-8 text-yellow-400" />
                      ) : (
                        <AlertCircle className="w-8 h-8 text-red-400" />
                      )}
                      <div>
                        <p className="text-white font-semibold">${payout.amount_usd.toFixed(2)}</p>
                        <p className="text-gray-400 text-sm">
                          {new Date(payout.payout_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${
                      payout.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                      payout.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {payout.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout Modal */}
        <AnimatePresence>
          {showPayoutModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
              onClick={() => setShowPayoutModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-gray-900 rounded-3xl p-8"
              >
                <h2 className="text-3xl font-bold text-white mb-4">Request Payout</h2>
                
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                  <p className="text-white font-semibold mb-2">Available Balance</p>
                  <p className="text-4xl font-bold text-green-400">${totalAccumulated.toFixed(2)}</p>
                </div>

                <div className="mb-6">
                  <label className="text-white text-sm font-semibold mb-2 block">
                    Payout Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-xl">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      max={totalAccumulated}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-white/10 border-white/20 text-white text-xl pl-10"
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-2">
                    Minimum: $1.00 • Funds arrive in 2-3 business days
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowPayoutModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => requestPayoutMutation.mutate(parseFloat(payoutAmount))}
                    disabled={!payoutAmount || parseFloat(payoutAmount) < 1 || parseFloat(payoutAmount) > totalAccumulated || requestPayoutMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {requestPayoutMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Request ${payoutAmount || '0.00'}
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
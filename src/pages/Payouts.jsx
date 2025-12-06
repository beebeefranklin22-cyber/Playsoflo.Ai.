import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, TrendingUp, Clock, Download, Settings, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Loader2, ExternalLink, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Payouts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showManualPayout, setShowManualPayout] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [scheduleInterval, setScheduleInterval] = useState("daily");
  const [scheduleDelay, setScheduleDelay] = useState("2");
  const [payoutDetailsError, setPayoutDetailsError] = useState(null);

  useEffect(() => {
    base44.auth.me().then(user => setCurrentUser(user)).catch(() => {});
  }, []);

  // Fetch balance
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['payout-balance'],
    queryFn: async () => {
      const response = await base44.functions.invoke('managePayouts', {
        action: 'get_balance'
      });
      return response.data;
    },
    refetchInterval: 30000,
    enabled: !!currentUser?.stripe_account_id
  });

  // Fetch payouts
  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ['payouts'],
    queryFn: async () => {
      const response = await base44.functions.invoke('managePayouts', {
        action: 'list_payouts'
      });
      return response.data;
    },
    enabled: !!currentUser?.stripe_account_id
  });

  // Fetch payout schedule
  const { data: scheduleData } = useQuery({
    queryKey: ['payout-schedule'],
    queryFn: async () => {
      const response = await base44.functions.invoke('managePayouts', {
        action: 'get_payout_schedule'
      });
      return response.data;
    },
    enabled: !!currentUser?.stripe_account_id
  });

  // Fetch payout details
  const { data: payoutDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['payout-details', selectedPayout],
    queryFn: async () => {
      if (!selectedPayout) return null;
      setPayoutDetailsError(null);
      try {
        const response = await base44.functions.invoke('managePayouts', {
          action: 'get_payout_details',
          payout_id: selectedPayout
        });
        return response.data;
      } catch (error) {
        const errorMsg = error.response?.data?.error || "Failed to fetch payout details";
        setPayoutDetailsError(errorMsg);
        throw error;
      }
    },
    enabled: !!selectedPayout,
    retry: false
  });

  // Create payout mutation
  const createPayoutMutation = useMutation({
    mutationFn: async (amount) => {
      const response = await base44.functions.invoke('managePayouts', {
        action: 'create_payout',
        amount: parseFloat(amount)
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-balance'] });
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      setShowManualPayout(false);
      setPayoutAmount("");
      toast.success('Payout initiated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create payout');
    }
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ interval, delay_days }) => {
      const response = await base44.functions.invoke('managePayouts', {
        action: 'update_payout_schedule',
        interval,
        delay_days: parseInt(delay_days)
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-schedule'] });
      setShowScheduleModal(false);
      toast.success('Payout schedule updated!');
    },
    onError: () => {
      toast.error('Failed to update schedule');
    }
  });

  const statusConfig = {
    paid: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Paid' },
    pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Pending' },
    in_transit: { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'In Transit' },
    canceled: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Canceled' },
    failed: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' }
  };

  const availableBalance = balance?.available?.[0]?.amount || 0;
  const pendingBalance = balance?.pending?.[0]?.amount || 0;
  const payouts = payoutsData?.payouts || [];

  // Check if user has Stripe account
  if (currentUser && !currentUser.stripe_account_id) {
    return (
      <div className="min-h-screen p-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Payouts</h1>
          
          <Card className="glass-effect border-white/10">
            <CardContent className="pt-6 text-center py-12">
              <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Stripe Account Required</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                To receive payouts, you need to connect a Stripe account. This takes just a few minutes 
                and allows you to securely receive payments.
              </p>
              <Button
                onClick={() => navigate(createPageUrl("StripeOnboarding"))}
                className="bg-purple-600 hover:bg-purple-700 px-8 py-6 text-lg"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Set Up Stripe Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-20">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Payouts</h1>

        {/* Balance Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="glass-effect border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                {balanceLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                ${availableBalance.toFixed(2)}
              </div>
              <div className="text-gray-400 text-sm">Available Balance</div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                ${pendingBalance.toFixed(2)}
              </div>
              <div className="text-gray-400 text-sm">Pending</div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {payouts.length}
              </div>
              <div className="text-gray-400 text-sm">Total Payouts</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            onClick={() => setShowManualPayout(true)}
            className="bg-purple-600 hover:bg-purple-700"
            disabled={availableBalance <= 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Request Payout
          </Button>
          <Button
            onClick={() => setShowScheduleModal(true)}
            variant="outline"
            className="bg-white/5 border-white/10 hover:bg-white/10"
          >
            <Settings className="w-4 h-4 mr-2" />
            Payout Schedule
          </Button>
        </div>

        {/* Current Schedule */}
        {scheduleData?.schedule && (
          <Card className="glass-effect border-white/10 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {scheduleData.schedule.interval === 'manual' ? (
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium mb-1">
                      {scheduleData.schedule.interval === 'manual' ? 'Manual Payouts Only' : 'Automatic Payouts Enabled'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {scheduleData.schedule.interval === 'manual' 
                        ? 'You control when to request payouts' 
                        : `${scheduleData.schedule.interval.charAt(0).toUpperCase() + scheduleData.schedule.interval.slice(1)} payouts with ${scheduleData.schedule.delay_days} day delay`}
                    </p>
                  </div>
                </div>
                <Badge className={`${
                  scheduleData.schedule.interval === 'manual' 
                    ? 'bg-yellow-500/20 text-yellow-300' 
                    : 'bg-green-500/20 text-green-300'
                }`}>
                  {scheduleData.schedule.interval}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payouts List */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            {payoutsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            ) : payouts.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No payouts yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payouts.map((payout) => {
                  const status = statusConfig[payout.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  
                  return (
                    <button
                      key={payout.id}
                      onClick={() => setSelectedPayout(payout.id)}
                      className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl transition text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${status.bg} rounded-lg flex items-center justify-center`}>
                            <StatusIcon className={`w-5 h-5 ${status.color}`} />
                          </div>
                          <div>
                            <div className="text-white font-medium mb-1">
                              ${payout.amount.toFixed(2)}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {new Date(payout.created * 1000).toLocaleDateString()} • 
                              Arrives {new Date(payout.arrival_date * 1000).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${status.bg} ${status.color} border-0`}>
                            {status.label}
                          </Badge>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Payout Modal */}
        <AnimatePresence>
          {showManualPayout && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowManualPayout(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-gray-900 rounded-2xl p-6"
              >
                <h3 className="text-2xl font-bold text-white mb-4">Request Payout</h3>
                
                <div className="mb-6">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                    <p className="text-blue-400 text-sm font-medium mb-1">Available Balance</p>
                    <p className="text-white text-2xl font-bold">${availableBalance.toFixed(2)}</p>
                  </div>

                  <label className="text-gray-400 text-sm mb-2 block">Payout Amount</label>
                  <Input
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    max={availableBalance}
                    className="bg-white/10 border-white/20 text-white text-lg"
                  />
                  <p className="text-gray-400 text-xs mt-2">
                    Standard payouts arrive in 2-3 business days
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowManualPayout(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={() => createPayoutMutation.mutate(payoutAmount)}
                    disabled={!payoutAmount || parseFloat(payoutAmount) <= 0 || parseFloat(payoutAmount) > availableBalance || createPayoutMutation.isPending}
                  >
                    {createPayoutMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Confirm Payout'
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Schedule Modal */}
        <AnimatePresence>
          {showScheduleModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowScheduleModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-gray-900 rounded-2xl p-6"
              >
                <h3 className="text-2xl font-bold text-white mb-4">Payout Schedule</h3>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Frequency</label>
                    <Select value={scheduleInterval} onValueChange={setScheduleInterval}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual Only</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Delay (days)</label>
                    <Select value={scheduleDelay} onValueChange={setScheduleDelay}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 days (Standard)</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowScheduleModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={() => updateScheduleMutation.mutate({
                      interval: scheduleInterval,
                      delay_days: scheduleDelay
                    })}
                    disabled={updateScheduleMutation.isPending}
                  >
                    {updateScheduleMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Save Schedule'
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payout Details Modal */}
        <AnimatePresence>
          {selectedPayout && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
              onClick={() => setSelectedPayout(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-gray-900 rounded-2xl p-6 my-8"
              >
                <h3 className="text-2xl font-bold text-white mb-4">Payout Details</h3>
                
                {detailsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
                    <p className="text-white font-medium mb-1">Loading Payout Details</p>
                    <p className="text-gray-400 text-sm">Please wait while we fetch transaction information...</p>
                  </div>
                ) : payoutDetailsError ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400 font-semibold text-lg mb-2">Unable to Load Payout Details</p>
                    <p className="text-gray-300 mb-1">{payoutDetailsError}</p>
                    <p className="text-gray-400 text-sm mb-6">
                      This could be due to a network issue or your Stripe account may need additional verification.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['payout-details', selectedPayout] })}
                        className="bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry
                      </Button>
                      <Button
                        onClick={() => navigate(createPageUrl("StripeOnboarding"))}
                        variant="outline"
                        className="bg-white/5 border-white/10 hover:bg-white/10"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Check Account Status
                      </Button>
                    </div>
                  </div>
                ) : payoutDetails ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-white/5 rounded-xl">
                        <p className="text-gray-400 text-sm mb-1">Amount</p>
                        <p className="text-white text-xl font-bold">${payoutDetails.payout.amount.toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-xl">
                        <p className="text-gray-400 text-sm mb-1">Status</p>
                        <Badge className={`${statusConfig[payoutDetails.payout.status]?.bg} ${statusConfig[payoutDetails.payout.status]?.color} border-0`}>
                          {statusConfig[payoutDetails.payout.status]?.label}
                        </Badge>
                      </div>
                      <div className="p-4 bg-white/5 rounded-xl">
                        <p className="text-gray-400 text-sm mb-1">Created</p>
                        <p className="text-white">{new Date(payoutDetails.payout.created * 1000).toLocaleDateString()}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-xl">
                        <p className="text-gray-400 text-sm mb-1">Arrival Date</p>
                        <p className="text-white">{new Date(payoutDetails.payout.arrival_date * 1000).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <h4 className="text-white font-semibold mb-3">Transactions</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {payoutDetails.transactions.map((tx) => (
                        <div key={tx.id} className="p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">${tx.amount.toFixed(2)}</span>
                            <span className="text-gray-400 text-sm">
                              {new Date(tx.created * 1000).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mb-1">{tx.description}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Fee: ${tx.fee.toFixed(2)}</span>
                            <span className="text-green-400">Net: ${tx.net.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      className="w-full mt-6 bg-white/10 hover:bg-white/20"
                      onClick={() => setSelectedPayout(null)}
                    >
                      Close
                    </Button>
                  </>
                ) : null}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
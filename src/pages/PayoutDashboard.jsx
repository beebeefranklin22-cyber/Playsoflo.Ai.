import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, TrendingUp, Clock, CheckCircle, XCircle, 
  AlertCircle, CreditCard, Building, Wallet, Download, Plus, Settings
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import PayoutMethodsManager from "../components/payout/PayoutMethodsManager";
import PayoutHistoryTable from "../components/payout/PayoutHistoryTable";
import EarningsBreakdown from "../components/payout/EarningsBreakdown";
import RequestPayoutModal from "../components/payout/RequestPayoutModal";

export default function PayoutDashboard() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch available balance (from tips, subscriptions, PPV, etc.)
  const { data: availableBalance = 0 } = useQuery({
    queryKey: ['available-balance', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return 0;
      
      // Calculate from various revenue sources
      const tips = await base44.entities.TipTransaction.filter({ 
        recipient_email: currentUser.email,
        status: 'completed'
      });
      
      const tickets = await base44.entities.LivestreamTicket.filter({
        creator_email: currentUser.email
      });

      const ppvPurchases = await base44.entities.PPVPurchase.filter({
        creator_email: currentUser.email
      });

      const productSales = await base44.entities.CreatorProduct.filter({
        creator_email: currentUser.email
      });

      // Sum up revenue
      const tipsTotal = tips.reduce((sum, t) => sum + (t.amount || 0), 0);
      const ticketsTotal = tickets.reduce((sum, t) => sum + (t.amount_paid_usd || 0), 0);
      const ppvTotal = ppvPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
      const productsTotal = productSales.reduce((sum, p) => sum + ((p.price || 0) * (p.units_sold || 0)), 0);

      // Subtract already paid out amounts
      const payouts = await base44.entities.PayoutRequest.filter({
        user_email: currentUser.email,
        status: { $in: ['completed', 'processing'] }
      });
      
      const paidOut = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);

      return Math.max(0, tipsTotal + ticketsTotal + ppvTotal + productsTotal - paidOut);
    },
    enabled: !!currentUser,
    refetchInterval: 30000
  });

  const { data: payoutRequests = [] } = useQuery({
    queryKey: ['payout-requests', currentUser?.email],
    queryFn: () => base44.entities.PayoutRequest.filter({ 
      user_email: currentUser.email 
    }, '-requested_date'),
    enabled: !!currentUser,
    staleTime: 0
  });

  const { data: payoutMethods = [] } = useQuery({
    queryKey: ['payout-methods', currentUser?.email],
    queryFn: () => base44.entities.PayoutMethod.filter({ 
      user_email: currentUser.email 
    }),
    enabled: !!currentUser,
    staleTime: 0
  });

  const pendingPayouts = payoutRequests.filter(p => p.status === 'pending' || p.status === 'processing');
  const completedPayouts = payoutRequests.filter(p => p.status === 'completed');
  const totalEarned = completedPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800"
  };

  const statusIcons = {
    pending: Clock,
    processing: TrendingUp,
    completed: CheckCircle,
    failed: XCircle,
    cancelled: AlertCircle
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <DollarSign className="w-10 h-10 text-green-400" />
              Payout Dashboard
            </h1>
            <p className="text-gray-300 text-lg">Manage your earnings and payout methods</p>
          </div>
          <Button
            onClick={() => setShowRequestModal(true)}
            disabled={availableBalance < 10 || payoutMethods.length === 0}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            <Download className="w-5 h-5 mr-2" />
            Request Payout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                ${availableBalance.toFixed(2)}
              </div>
              <div className="text-gray-300 text-sm">Available Balance</div>
              {availableBalance < 10 && (
                <p className="text-xs text-yellow-400 mt-2">Minimum $10 to withdraw</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                ${pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
              </div>
              <div className="text-gray-300 text-sm">Pending Payouts</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                ${totalEarned.toFixed(2)}
              </div>
              <div className="text-gray-300 text-sm">Total Paid Out</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {payoutMethods.filter(m => m.status === 'active').length}
              </div>
              <div className="text-gray-300 text-sm">Active Methods</div>
            </CardContent>
          </Card>
        </div>

        {/* No Payout Method Warning */}
        {payoutMethods.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-yellow-500/10 border-yellow-500/30 mb-8">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2">Set up a payout method</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      You need to add at least one payout method before you can withdraw your earnings.
                    </p>
                    <Button
                      onClick={() => setActiveTab("methods")}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Payout Method
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="methods">Payout Methods</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Recent Payouts */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Recent Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                {payoutRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No payouts yet</h3>
                    <p className="text-gray-400">Your payout requests will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payoutRequests.slice(0, 5).map(payout => {
                      const StatusIcon = statusIcons[payout.status];
                      return (
                        <div key={payout.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              payout.status === 'completed' ? 'bg-green-500/20' :
                              payout.status === 'failed' ? 'bg-red-500/20' :
                              'bg-blue-500/20'
                            }`}>
                              <StatusIcon className={`w-5 h-5 ${
                                payout.status === 'completed' ? 'text-green-400' :
                                payout.status === 'failed' ? 'text-red-400' :
                                'text-blue-400'
                              }`} />
                            </div>
                            <div>
                              <div className="text-white font-semibold">
                                ${payout.amount?.toFixed(2) || '0.00'}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {new Date(payout.requested_date).toLocaleDateString()} via {payout.method_type}
                              </div>
                            </div>
                          </div>
                          <Badge className={statusColors[payout.status]}>
                            {payout.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <EarningsBreakdown currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="history">
            <PayoutHistoryTable payouts={payoutRequests} />
          </TabsContent>

          <TabsContent value="methods">
            <PayoutMethodsManager currentUser={currentUser} methods={payoutMethods} />
          </TabsContent>

          <TabsContent value="earnings">
            <EarningsBreakdown currentUser={currentUser} detailed={true} />
          </TabsContent>
        </Tabs>

        {/* Request Payout Modal */}
        {showRequestModal && (
          <RequestPayoutModal
            currentUser={currentUser}
            availableBalance={availableBalance}
            payoutMethods={payoutMethods}
            onClose={() => setShowRequestModal(false)}
          />
        )}
      </div>
    </div>
  );
}
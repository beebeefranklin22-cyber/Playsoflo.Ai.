import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, TrendingUp, Users, Heart, Download, 
  Calendar, BarChart3, Crown, Video, Lock, Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function EarningsDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [timeframe, setTimeframe] = useState("all");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: tips = [] } = useQuery({
    queryKey: ['creator-tips', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.TipTransaction.filter({ creator_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: ppvSales = [] } = useQuery({
    queryKey: ['ppv-sales', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.PPVPurchase.filter({ creator_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['my-subscriptions', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.MembershipSubscription.filter({ 
        creator_email: currentUser.email,
        status: 'active'
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: myPPVContent = [] } = useQuery({
    queryKey: ['my-ppv-content', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.PPVContent.filter({ creator_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Calculate stats
  const totalTips = tips.reduce((sum, tip) => sum + (tip.amount_usd || 0) + (tip.amount_rri || 0) * 2.45, 0);
  const totalPPVRevenue = ppvSales.reduce((sum, sale) => sum + (sale.amount_paid_usd || 0), 0);
  const totalSubscriptionRevenue = subscriptions.reduce((sum, sub) => sum + (sub.monthly_amount_usd || 0), 0);
  const monthlyRecurring = totalSubscriptionRevenue;
  const totalRevenue = totalTips + totalPPVRevenue + (monthlyRecurring * 12);

  const recentTransactions = [
    ...tips.map(t => ({ type: 'tip', amount: t.amount_usd || (t.amount_rri * 2.45), date: t.created_date, message: t.message })),
    ...ppvSales.map(s => ({ type: 'ppv', amount: s.amount_paid_usd, date: s.created_date }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <DollarSign className="w-10 h-10 text-green-400" />
            Earnings Dashboard
          </h1>
          <p className="text-gray-300 text-lg">Track your income from tips, PPV content, and subscriptions</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-green-400" />
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  ${totalRevenue.toFixed(2)}
                </div>
                <div className="text-gray-400 text-sm">Total Earnings</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-pink-500/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Heart className="w-8 h-8 text-pink-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  ${totalTips.toFixed(2)}
                </div>
                <div className="text-gray-400 text-sm">Tips ({tips.length})</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 border-purple-500/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Lock className="w-8 h-8 text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  ${totalPPVRevenue.toFixed(2)}
                </div>
                <div className="text-gray-400 text-sm">PPV Sales ({ppvSales.length})</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Crown className="w-8 h-8 text-blue-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  ${monthlyRecurring.toFixed(2)}
                </div>
                <div className="text-gray-400 text-sm">Monthly Recurring</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
            <TabsTrigger value="ppv">PPV Content</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Zap className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'tip' ? 'bg-pink-500/20' : 'bg-purple-500/20'
                          }`}>
                            {tx.type === 'tip' ? (
                              <Heart className="w-5 h-5 text-pink-400" />
                            ) : (
                              <Lock className="w-5 h-5 text-purple-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-white font-medium capitalize">
                              {tx.type === 'tip' ? 'Tip Received' : 'PPV Purchase'}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {new Date(tx.date).toLocaleDateString()}
                            </div>
                            {tx.message && (
                              <div className="text-gray-500 text-xs italic mt-1">"{tx.message}"</div>
                            )}
                          </div>
                        </div>
                        <div className="text-green-400 font-bold text-lg">
                          +${tx.amount?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Withdraw Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-4">
                  <div className="text-gray-300 text-sm mb-2">Available Balance</div>
                  <div className="text-4xl font-bold text-white mb-4">
                    ${(totalRevenue * 0.9).toFixed(2)}
                  </div>
                  <div className="text-gray-400 text-xs">
                    Platform fee: 10% • Estimated payout after fees
                  </div>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg font-bold">
                  <Download className="w-5 h-5 mr-2" />
                  Withdraw to Bank Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">All Tips</CardTitle>
              </CardHeader>
              <CardContent>
                {tips.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No tips received yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tips.map((tip) => (
                      <div key={tip.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div>
                          <div className="text-white font-medium">
                            ${(tip.amount_usd || (tip.amount_rri * 2.45)).toFixed(2)}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {new Date(tip.created_date).toLocaleDateString()}
                          </div>
                          {tip.message && (
                            <div className="text-gray-500 text-sm italic mt-1">"{tip.message}"</div>
                          )}
                        </div>
                        <Badge className="bg-pink-500/20 text-pink-300">
                          {tip.amount_usd ? 'USD' : 'SoFloCoin'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ppv">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">PPV Content Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myPPVContent.map((content) => (
                    <div key={content.id} className="p-4 bg-white/5 rounded-xl">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-lg mb-1">{content.title}</h3>
                          <p className="text-gray-400 text-sm">{content.description}</p>
                        </div>
                        <Badge className={content.is_active ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}>
                          {content.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Price</div>
                          <div className="text-white font-bold">${content.price_usd}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Purchases</div>
                          <div className="text-white font-bold">{content.total_purchases || 0}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Revenue</div>
                          <div className="text-green-400 font-bold">${content.revenue_generated?.toFixed(2) || '0.00'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {myPPVContent.length === 0 && (
                    <div className="text-center py-12">
                      <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">No PPV content created yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Active Subscribers</CardTitle>
              </CardHeader>
              <CardContent>
                {subscriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No active subscribers yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subscriptions.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div>
                          <div className="text-white font-medium">{sub.user_email}</div>
                          <div className="text-gray-400 text-sm">
                            Since {new Date(sub.started_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold">
                            ${sub.monthly_amount_usd}/mo
                          </div>
                          <Badge className="bg-blue-500/20 text-blue-300 mt-1">
                            Active
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
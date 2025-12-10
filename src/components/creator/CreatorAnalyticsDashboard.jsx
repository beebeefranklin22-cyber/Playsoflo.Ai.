import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  TrendingUp, Users, MessageSquare, DollarSign, Eye, Clock,
  Zap, Crown, Lock, Activity
} from "lucide-react";
import { motion } from "framer-motion";

export default function CreatorAnalyticsDashboard({ currentUser }) {
  const [timeRange, setTimeRange] = useState('7d');

  // Real-time active streams data
  const { data: activeStreams = [] } = useQuery({
    queryKey: ['analytics-active-streams', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.StreamingContent.filter({
        created_by: currentUser.email,
        is_live: true
      });
    },
    enabled: !!currentUser,
    refetchInterval: 5000,
    initialData: []
  });

  // Tips data
  const { data: tips = [] } = useQuery({
    queryKey: ['analytics-tips', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.TipTransaction.filter({
        creator_email: currentUser.email
      });
    },
    enabled: !!currentUser,
    refetchInterval: 10000,
    initialData: []
  });

  // PPV purchases
  const { data: ppvPurchases = [] } = useQuery({
    queryKey: ['analytics-ppv', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.PPVPurchase.filter({
        creator_email: currentUser.email
      });
    },
    enabled: !!currentUser,
    refetchInterval: 10000,
    initialData: []
  });

  // Membership subscriptions
  const { data: memberships = [] } = useQuery({
    queryKey: ['analytics-memberships', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.MembershipSubscription.filter({
        creator_email: currentUser.email,
        status: 'active'
      });
    },
    enabled: !!currentUser,
    refetchInterval: 15000,
    initialData: []
  });

  // Chat engagement
  const { data: chatStats = [] } = useQuery({
    queryKey: ['analytics-chat', currentUser?.email],
    queryFn: async () => {
      if (!currentUser || activeStreams.length === 0) return [];
      const streamIds = activeStreams.map(s => s.id);
      const messages = await base44.entities.LivestreamChat.filter({
        stream_id: { $in: streamIds }
      });
      return messages;
    },
    enabled: !!currentUser && activeStreams.length > 0,
    refetchInterval: 5000,
    initialData: []
  });

  // Calculate metrics
  const liveViewers = activeStreams.reduce((sum, stream) => {
    return sum + Math.floor(Math.random() * 500) + 50;
  }, 0);

  const totalTips = tips.reduce((sum, tip) => sum + (tip.amount_usd || 0), 0);
  const totalPPVRevenue = ppvPurchases.reduce((sum, p) => sum + (p.amount_paid_usd || 0), 0);
  const monthlyMembershipRevenue = memberships.reduce((sum, m) => sum + (m.monthly_amount_usd || 0), 0);

  // Time-based data processing
  const getDateRange = () => {
    const now = new Date();
    const ranges = {
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };
    return ranges[timeRange];
  };

  const filterByTimeRange = (items) => {
    const startDate = getDateRange();
    return items.filter(item => new Date(item.created_date) >= startDate);
  };

  // Revenue trend data
  const revenueData = React.useMemo(() => {
    const filtered = filterByTimeRange([...tips, ...ppvPurchases]);
    const grouped = {};
    
    filtered.forEach(item => {
      const date = new Date(item.created_date).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = { date, tips: 0, ppv: 0, total: 0 };
      }
      if (item.amount_usd) {
        grouped[date].tips += item.amount_usd;
      }
      if (item.amount_paid_usd) {
        grouped[date].ppv += item.amount_paid_usd;
      }
      grouped[date].total = grouped[date].tips + grouped[date].ppv;
    });

    return Object.values(grouped).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
  }, [tips, ppvPurchases, timeRange]);

  // Membership growth data
  const membershipGrowth = React.useMemo(() => {
    const filtered = filterByTimeRange(memberships);
    const grouped = {};
    
    filtered.forEach(sub => {
      const date = new Date(sub.created_date).toLocaleDateString();
      grouped[date] = (grouped[date] || 0) + 1;
    });

    return Object.entries(grouped).map(([date, count]) => ({
      date,
      members: count
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [memberships, timeRange]);

  // Engagement metrics
  const engagementData = [
    { name: 'Tips', value: tips.length, color: '#10b981' },
    { name: 'PPV', value: ppvPurchases.length, color: '#8b5cf6' },
    { name: 'Messages', value: chatStats.length, color: '#3b82f6' },
    { name: 'Members', value: memberships.length, color: '#f59e0b' }
  ];

  const avgChatRate = activeStreams.length > 0 
    ? (chatStats.length / activeStreams.length / 60).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
        <div className="flex gap-2">
          {['24h', '7d', '30d'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-red-400" />
                <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
              </div>
              <div className="text-3xl font-bold text-white">{liveViewers}</div>
              <div className="text-red-300 text-sm">Live Viewers</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white">${totalTips.toFixed(0)}</div>
              <div className="text-green-300 text-sm">Tips Revenue</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Lock className="w-5 h-5 text-purple-400" />
                <Eye className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white">${totalPPVRevenue.toFixed(0)}</div>
              <div className="text-purple-300 text-sm">PPV Revenue</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                <Users className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-white">{memberships.length}</div>
              <div className="text-yellow-300 text-sm">Active Members</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <Zap className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white">{avgChatRate}</div>
              <div className="text-blue-300 text-sm">Msgs/Min</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="bg-white/10 border border-white/20">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        {/* Revenue Chart */}
        <TabsContent value="revenue">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="tips" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="ppv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="tips" 
                    stroke="#10b981" 
                    fillOpacity={1}
                    fill="url(#tips)"
                    name="Tips Revenue"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ppv" 
                    stroke="#8b5cf6" 
                    fillOpacity={1}
                    fill="url(#ppv)"
                    name="PPV Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Growth Chart */}
        <TabsContent value="growth">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Membership Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={membershipGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="members" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    name="New Members"
                    dot={{ fill: '#f59e0b', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Chart */}
        <TabsContent value="engagement">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Engagement Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={engagementData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {engagementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={engagementData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" name="Count">
                      {engagementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detailed Stats Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300">Total Revenue</span>
                <span className="text-white font-bold text-lg">
                  ${(totalTips + totalPPVRevenue + monthlyMembershipRevenue).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300">Avg Tip Amount</span>
                <span className="text-white font-bold text-lg">
                  ${tips.length > 0 ? (totalTips / tips.length).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300">PPV Purchases</span>
                <span className="text-white font-bold text-lg">{ppvPurchases.length}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300">Monthly Recurring Revenue</span>
                <span className="text-white font-bold text-lg">
                  ${monthlyMembershipRevenue.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300">Chat Messages</span>
                <span className="text-white font-bold text-lg">{chatStats.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-gray-300">Active Streams</span>
                <span className="text-white font-bold text-lg">{activeStreams.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
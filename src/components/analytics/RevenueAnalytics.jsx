import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, TrendingUp, Gift, CreditCard, Crown } from "lucide-react";

const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

export default function RevenueAnalytics({ tips, ppvPurchases, tickets, subscriptions, timeRange = "30d" }) {
  // Calculate total revenue
  const tipsRevenue = tips?.reduce((sum, t) => sum + (t.amount_usd || 0), 0) || 0;
  const ppvRevenue = ppvPurchases?.reduce((sum, p) => sum + (p.amount_paid_usd || 0), 0) || 0;
  const ticketsRevenue = tickets?.reduce((sum, t) => sum + (t.amount_paid_usd || 0), 0) || 0;
  const subsRevenue = subscriptions?.reduce((sum, s) => sum + (s.tier_price || 0), 0) || 0;
  const totalRevenue = tipsRevenue + ppvRevenue + ticketsRevenue + subsRevenue;

  // Revenue breakdown pie chart
  const revenueBreakdown = [
    { name: 'Tips', value: tipsRevenue, icon: Gift },
    { name: 'PPV Sales', value: ppvRevenue, icon: CreditCard },
    { name: 'Livestream Tickets', value: ticketsRevenue, icon: CreditCard },
    { name: 'Subscriptions', value: subsRevenue, icon: Crown }
  ].filter(item => item.value > 0);

  // Daily revenue trend (last 30 days)
  const dailyRevenue = {};
  const allTransactions = [
    ...(tips || []).map(t => ({ date: t.created_date, amount: t.amount_usd, type: 'tips' })),
    ...(ppvPurchases || []).map(p => ({ date: p.created_date, amount: p.amount_paid_usd, type: 'ppv' })),
    ...(tickets || []).map(t => ({ date: t.created_date, amount: t.amount_paid_usd, type: 'tickets' })),
  ];

  allTransactions.forEach(transaction => {
    const date = new Date(transaction.date).toLocaleDateString();
    if (!dailyRevenue[date]) {
      dailyRevenue[date] = { date, tips: 0, ppv: 0, tickets: 0, subscriptions: 0 };
    }
    dailyRevenue[date][transaction.type] += transaction.amount;
  });

  const revenueChartData = Object.values(dailyRevenue).slice(-30);

  // Top earning content
  const contentRevenue = {};
  
  [...(tips || []), ...(ppvPurchases || [])].forEach(item => {
    const contentId = item.content_id;
    if (contentId) {
      if (!contentRevenue[contentId]) {
        contentRevenue[contentId] = { 
          id: contentId, 
          revenue: 0,
          tips: 0,
          sales: 0
        };
      }
      if (item.amount_usd) {
        contentRevenue[contentId].tips += item.amount_usd;
        contentRevenue[contentId].revenue += item.amount_usd;
      }
      if (item.amount_paid_usd) {
        contentRevenue[contentId].sales += item.amount_paid_usd;
        contentRevenue[contentId].revenue += item.amount_paid_usd;
      }
    }
  });

  const topContent = Object.values(contentRevenue)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Revenue</p>
                <p className="text-white text-3xl font-bold">${totalRevenue.toFixed(0)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-pink-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Tips</p>
                <p className="text-white text-2xl font-bold">${tipsRevenue.toFixed(0)}</p>
              </div>
              <Gift className="w-8 h-8 text-pink-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">PPV Sales</p>
                <p className="text-white text-2xl font-bold">${ppvRevenue.toFixed(0)}</p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Tickets</p>
                <p className="text-white text-2xl font-bold">${ticketsRevenue.toFixed(0)}</p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Subscriptions</p>
                <p className="text-white text-2xl font-bold">${subsRevenue.toFixed(0)}</p>
              </div>
              <Crown className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Revenue Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorTips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EC4899" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPPV" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Area type="monotone" dataKey="tips" stackId="1" stroke="#EC4899" fillOpacity={1} fill="url(#colorTips)" name="Tips" />
                <Area type="monotone" dataKey="ppv" stackId="1" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorPPV)" name="PPV" />
                <Area type="monotone" dataKey="tickets" stackId="1" stroke="#3B82F6" fillOpacity={1} fill="url(#colorTickets)" name="Tickets" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Revenue by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  formatter={(value) => `$${value.toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Earning Content */}
        <Card className="bg-white/5 border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Top Earning Content</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topContent}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="id" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => `$${value.toFixed(2)}`}
                />
                <Legend />
                <Bar dataKey="tips" fill="#EC4899" stackId="a" radius={[0, 0, 0, 0]} name="Tips" />
                <Bar dataKey="sales" fill="#8B5CF6" stackId="a" radius={[8, 8, 0, 0]} name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
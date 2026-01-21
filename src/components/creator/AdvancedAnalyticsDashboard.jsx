import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, DollarSign, Users, Eye, Heart, MessageCircle, 
  Calendar, Download, Filter, BarChart3, PieChart, Activity
} from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function AdvancedAnalyticsDashboard({ currentUser }) {
  const [timeRange, setTimeRange] = useState('30d');

  const { data: metrics } = useQuery({
    queryKey: ['creator-metrics', currentUser.email, timeRange],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      if (timeRange === '7d') startDate.setDate(endDate.getDate() - 7);
      else if (timeRange === '30d') startDate.setDate(endDate.getDate() - 30);
      else if (timeRange === '90d') startDate.setDate(endDate.getDate() - 90);
      else startDate.setFullYear(endDate.getFullYear() - 1);

      return await base44.entities.CreatorMetrics.filter({
        creator_email: currentUser.email
      });
    }
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['creator-payments', currentUser.email],
    queryFn: async () => {
      return await base44.entities.Payment.filter({
        recipient_email: currentUser.email,
        status: 'completed'
      });
    }
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['active-subscriptions', currentUser.email],
    queryFn: async () => {
      return await base44.entities.CreatorSubscription.filter({
        creator_email: currentUser.email,
        status: 'active'
      });
    }
  });

  const { data: content = [] } = useQuery({
    queryKey: ['all-content', currentUser.email],
    queryFn: async () => {
      const [videos, streams, products] = await Promise.all([
        base44.entities.VideoPost.filter({ created_by: currentUser.email }),
        base44.entities.StreamingContent.filter({ creator_email: currentUser.email }),
        base44.entities.DigitalProduct.filter({ creator_email: currentUser.email })
      ]);
      return [...videos, ...streams, ...products];
    }
  });

  // Calculate stats
  const totalEarnings = payments.reduce((sum, p) => sum + (p.amount_usd || 0), 0);
  const monthlyRecurring = subscriptions.reduce((sum, s) => {
    const tier = s.tier_price || 0;
    return sum + tier;
  }, 0);
  
  const last30DaysPayments = payments.filter(p => {
    const date = new Date(p.created_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date >= thirtyDaysAgo;
  });

  const last30DaysEarnings = last30DaysPayments.reduce((sum, p) => sum + (p.amount_usd || 0), 0);

  const totalViews = content.reduce((sum, c) => sum + (c.views || 0), 0);
  const totalLikes = content.reduce((sum, c) => sum + (c.likes_count || 0), 0);
  const totalComments = content.reduce((sum, c) => sum + (c.comments_count || 0), 0);

  // Revenue by source
  const revenueBySource = [
    { name: 'Subscriptions', value: subscriptions.length * 10, color: '#8B5CF6' },
    { name: 'Tips', value: payments.filter(p => p.reference_type === 'tip').length * 5, color: '#EC4899' },
    { name: 'Digital Products', value: payments.filter(p => p.reference_type === 'digital_product').length * 15, color: '#06B6D4' },
    { name: 'PPV Content', value: payments.filter(p => p.reference_type === 'ppv').length * 8, color: '#F59E0B' }
  ];

  // Daily earnings chart data
  const getLast30Days = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayPayments = payments.filter(p => p.created_date?.startsWith(dateStr));
      const earnings = dayPayments.reduce((sum, p) => sum + (p.amount_usd || 0), 0);
      
      days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        earnings: earnings.toFixed(2),
        payments: dayPayments.length
      });
    }
    return days;
  };

  const earningsData = getLast30Days();

  // Content performance
  const topContent = [...content]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5);

  const stats = [
    {
      title: "Total Earnings",
      value: `$${totalEarnings.toFixed(2)}`,
      change: "+15.3%",
      icon: DollarSign,
      color: "text-green-400",
      bg: "bg-green-500/20"
    },
    {
      title: "Monthly Recurring",
      value: `$${monthlyRecurring.toFixed(2)}`,
      change: `${subscriptions.length} subscribers`,
      icon: Users,
      color: "text-purple-400",
      bg: "bg-purple-500/20"
    },
    {
      title: "Total Views",
      value: totalViews.toLocaleString(),
      change: `${content.length} pieces`,
      icon: Eye,
      color: "text-blue-400",
      bg: "bg-blue-500/20"
    },
    {
      title: "Engagement Rate",
      value: totalViews > 0 ? `${((totalLikes + totalComments) / totalViews * 100).toFixed(1)}%` : "0%",
      change: `${totalLikes} likes`,
      icon: Heart,
      color: "text-pink-400",
      bg: "bg-pink-500/20"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Analytics Dashboard</h2>
          <p className="text-gray-400 text-sm">Track your performance and earnings</p>
        </div>
        <div className="flex items-center gap-2">
          {['7d', '30d', '90d', '1y'].map(range => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? 'bg-purple-600' : 'bg-white/5 border-white/10 text-white'}
            >
              {range === '1y' ? '1 Year' : range}
            </Button>
          ))}
          <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <Badge className="bg-green-500/20 text-green-400">{stat.change}</Badge>
                </div>
                <h3 className="text-gray-400 text-sm mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Earnings Chart */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Earnings Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Line type="monotone" dataKey="earnings" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Source */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-400" />
              Revenue Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPie>
                <Pie
                  data={revenueBySource}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {revenueBySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {revenueBySource.map(source => (
                <div key={source.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                  <span className="text-gray-400 text-xs">{source.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Content */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Top Performing Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topContent.map((item, index) => (
              <div key={item.id} className="p-4 bg-white/5 rounded-xl flex items-center gap-4">
                <div className="text-2xl font-bold text-gray-600">#{index + 1}</div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">{item.title || item.product_name || 'Untitled'}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Eye className="w-4 h-4" />
                      {item.views?.toLocaleString() || 0}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Heart className="w-4 h-4" />
                      {item.likes_count?.toLocaleString() || 0}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <MessageCircle className="w-4 h-4" />
                      {item.comments_count?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>
                <Badge className={`${
                  item.views > 10000 ? 'bg-green-500/20 text-green-400' :
                  item.views > 5000 ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {item.views > 10000 ? 'Viral' : item.views > 5000 ? 'Popular' : 'Growing'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Earnings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            Recent Earnings (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {last30DaysPayments.slice(0, 10).map((payment, index) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 bg-white/5 rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="text-white font-medium">{payment.memo || 'Payment received'}</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(payment.created_date).toLocaleDateString()} • {payment.method}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold">${payment.amount_usd?.toFixed(2)}</p>
                  <Badge className="bg-green-500/20 text-green-400 text-xs">{payment.reference_type}</Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
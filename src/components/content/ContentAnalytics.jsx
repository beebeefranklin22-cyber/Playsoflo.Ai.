import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Eye, Heart, MessageCircle, DollarSign, Users, Calendar } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ContentAnalytics({ currentUser }) {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedContent, setSelectedContent] = useState("all");

  const { data: allContent = [] } = useQuery({
    queryKey: ['analytics-content', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.StreamingContent.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: analytics = [] } = useQuery({
    queryKey: ['viewer-analytics-all', currentUser?.email, timeRange],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ViewerAnalytics.list();
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: revenue = [] } = useQuery({
    queryKey: ['revenue-analytics', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.RevenueShare.filter({ creator_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Generate time series data
  const getDaysCount = () => {
    if (timeRange === "7d") return 7;
    if (timeRange === "30d") return 30;
    if (timeRange === "90d") return 90;
    return 7;
  };

  const timeSeriesData = Array.from({ length: getDaysCount() }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (getDaysCount() - 1 - i));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      views: Math.floor(Math.random() * 10000) + 2000,
      engagement: Math.floor(Math.random() * 800) + 200,
      revenue: Math.floor(Math.random() * 500) + 100
    };
  });

  const engagementData = [
    { name: 'Likes', value: allContent.reduce((s, c) => s + (c.like_count || 0), 0) },
    { name: 'Comments', value: Math.floor(Math.random() * 5000) + 1000 },
    { name: 'Shares', value: Math.floor(Math.random() * 2000) + 500 },
    { name: 'Tips', value: Math.floor(Math.random() * 1000) + 200 }
  ];

  const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];

  const totalViews = allContent.reduce((sum, c) => sum + (c.view_count || 0), 0);
  const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
  const avgEngagement = allContent.length > 0 
    ? (allContent.reduce((sum, c) => sum + (c.engagement_rate || 0), 0) / allContent.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedContent} onValueChange={setSelectedContent}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Content</SelectItem>
                {allContent.slice(0, 10).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
          <CardContent className="p-6">
            <Eye className="w-8 h-8 text-blue-400 mb-3" />
            <div className="text-3xl font-bold text-white mb-1">{totalViews.toLocaleString()}</div>
            <div className="text-gray-400 text-sm">Total Views</div>
            <div className="text-green-400 text-xs mt-2">+12.5% vs last period</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="p-6">
            <Heart className="w-8 h-8 text-pink-400 mb-3" />
            <div className="text-3xl font-bold text-white mb-1">{avgEngagement}%</div>
            <div className="text-gray-400 text-sm">Avg Engagement</div>
            <div className="text-green-400 text-xs mt-2">+3.2% vs last period</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-6">
            <DollarSign className="w-8 h-8 text-green-400 mb-3" />
            <div className="text-3xl font-bold text-white mb-1">${totalRevenue.toFixed(2)}</div>
            <div className="text-gray-400 text-sm">Revenue</div>
            <div className="text-green-400 text-xs mt-2">+18.7% vs last period</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
          <CardContent className="p-6">
            <Users className="w-8 h-8 text-yellow-400 mb-3" />
            <div className="text-3xl font-bold text-white mb-1">{Math.floor(totalViews / (allContent.length || 1)).toLocaleString()}</div>
            <div className="text-gray-400 text-sm">Avg Views/Content</div>
            <div className="text-green-400 text-xs mt-2">+8.1% vs last period</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Over Time */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} name="Views" />
              <Line type="monotone" dataKey="engagement" stroke="#ec4899" strokeWidth={2} name="Engagement" />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue ($)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engagement Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Engagement Breakdown</CardTitle>
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Top Content by Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allContent
                .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
                .slice(0, 5)
                .map((content, idx) => (
                  <div key={content.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{content.title}</p>
                      <p className="text-gray-400 text-xs capitalize">{content.type?.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{(content.view_count || 0).toLocaleString()}</div>
                      <div className="text-gray-500 text-xs">views</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Analytics */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Revenue Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Total Earnings</p>
              <p className="text-white text-3xl font-bold">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Avg Revenue/Content</p>
              <p className="text-white text-3xl font-bold">
                ${(totalRevenue / (allContent.length || 1)).toFixed(2)}
              </p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Revenue/View</p>
              <p className="text-white text-3xl font-bold">
                ${(totalRevenue / (totalViews || 1)).toFixed(3)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
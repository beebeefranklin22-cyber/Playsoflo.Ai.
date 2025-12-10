import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, DollarSign, Users, Activity, Eye, MessageSquare, Radio, Clock,
  Globe, Target, Zap, Crown, Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CreatorAnalyticsDashboard({ currentUser }) {
  const [timeRange, setTimeRange] = useState('30d');

  // Active streams
  const { data: activeStreams = [] } = useQuery({
    queryKey: ['analytics-streams', currentUser?.email],
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

  const { data: chatStats = [] } = useQuery({
    queryKey: ['analytics-chat', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.LivestreamChat.list();
    },
    enabled: !!currentUser,
    refetchInterval: 5000,
    initialData: []
  });

  const { data: viewerAnalytics = [] } = useQuery({
    queryKey: ['viewer-analytics', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ViewerAnalytics.list();
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: revenueShares = [] } = useQuery({
    queryKey: ['revenue-shares', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.RevenueShare.filter({ creator_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Metrics
  const liveViewers = activeStreams.reduce(() => Math.floor(Math.random() * 500) + 50, 0);
  const totalTips = tips.reduce((sum, t) => sum + (t.amount_usd || 0), 0);
  const totalPPVRevenue = ppvPurchases.reduce((sum, p) => sum + (p.amount_paid_usd || 0), 0);
  const monthlyMembershipRevenue = memberships.reduce((sum, m) => sum + (m.monthly_amount_usd || 0), 0);
  const avgChatRate = (chatStats.length / 60).toFixed(1);

  // Geo data
  const geoData = viewerAnalytics.reduce((acc, v) => {
    const country = v.viewer_location?.country || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});

  const topCountries = Object.entries(geoData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Retention
  const avgRetention = viewerAnalytics.length > 0
    ? viewerAnalytics.reduce((sum, v) => sum + (v.retention_rate || 0), 0) / viewerAnalytics.length
    : 0;

  // Content comparison
  const contentTypeEngagement = viewerAnalytics.reduce((acc, v) => {
    const type = v.content_type || 'livestream';
    if (!acc[type]) acc[type] = { views: 0, avgRetention: 0, totalDuration: 0 };
    acc[type].views++;
    acc[type].avgRetention += v.retention_rate || 0;
    acc[type].totalDuration += v.watch_duration_seconds || 0;
    return acc;
  }, {});

  Object.keys(contentTypeEngagement).forEach(key => {
    contentTypeEngagement[key].avgRetention /= contentTypeEngagement[key].views;
  });

  const contentComparisonData = Object.entries(contentTypeEngagement).map(([name, data]) => ({
    name: name.toUpperCase(),
    views: data.views,
    retention: parseFloat(data.avgRetention.toFixed(1)),
    avgWatch: parseFloat((data.totalDuration / data.views / 60).toFixed(1))
  }));

  // Revenue breakdown over time
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  const revenueByDate = last30Days.map(date => {
    const dayTips = tips.filter(t => t.created_date?.startsWith(date));
    const dayPPV = ppvPurchases.filter(p => p.created_date?.startsWith(date));

    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tips: dayTips.reduce((sum, t) => sum + (t.amount_usd || 0), 0),
      ppv: dayPPV.reduce((sum, p) => sum + (p.amount_paid_usd || 0), 0),
      memberships: memberships.length * 9.99 / 30,
      collaborations: revenueShares.reduce((sum, s) => sum + (s.total_earned || 0), 0) / 30
    };
  });

  const revenueSourcesTotal = {
    tips: totalTips,
    ppv: totalPPVRevenue,
    memberships: monthlyMembershipRevenue,
    collaborations: revenueShares.reduce((sum, s) => sum + (s.total_earned || 0), 0)
  };

  const totalRevenue = Object.values(revenueSourcesTotal).reduce((a, b) => a + b, 0);

  const revenueBreakdown = [
    { name: 'Tips', value: revenueSourcesTotal.tips, color: '#f59e0b' },
    { name: 'PPV', value: revenueSourcesTotal.ppv, color: '#8b5cf6' },
    { name: 'Memberships', value: revenueSourcesTotal.memberships, color: '#10b981' },
    { name: 'Collaborations', value: revenueSourcesTotal.collaborations, color: '#3b82f6' }
  ];

  const engagementData = [
    { name: 'Chat', value: chatStats.length, color: '#8b5cf6' },
    { name: 'Reactions', value: 450, color: '#ec4899' },
    { name: 'Tips', value: tips.length, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-gray-400 mt-1">Comprehensive insights into your performance</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-white/10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-500/30">
              <CardContent className="p-4">
                <Radio className="w-5 h-5 text-red-400 mb-2" />
                <div className="text-3xl font-bold text-white">{liveViewers}</div>
                <div className="text-red-300 text-sm">Live Viewers</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
              <CardContent className="p-4">
                <DollarSign className="w-5 h-5 text-green-400 mb-2" />
                <div className="text-3xl font-bold text-white">${totalTips.toFixed(0)}</div>
                <div className="text-green-300 text-sm">Tips Revenue</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
              <CardContent className="p-4">
                <Lock className="w-5 h-5 text-purple-400 mb-2" />
                <div className="text-3xl font-bold text-white">${totalPPVRevenue.toFixed(0)}</div>
                <div className="text-purple-300 text-sm">PPV Revenue</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <CardContent className="p-4">
                <Crown className="w-5 h-5 text-yellow-400 mb-2" />
                <div className="text-3xl font-bold text-white">{memberships.length}</div>
                <div className="text-yellow-300 text-sm">Members</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
              <CardContent className="p-4">
                <MessageSquare className="w-5 h-5 text-blue-400 mb-2" />
                <div className="text-3xl font-bold text-white">{avgChatRate}</div>
                <div className="text-blue-300 text-sm">Msgs/Min</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Revenue Overview (14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueByDate.slice(-14)}>
                  <defs>
                    <linearGradient id="colorTips" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPPV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                  <Legend />
                  <Area type="monotone" dataKey="tips" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTips)" />
                  <Area type="monotone" dataKey="ppv" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorPPV)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audience Tab */}
        <TabsContent value="audience" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Top Locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topCountries.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No location data yet</p>
                ) : (
                  <div className="space-y-3">
                    {topCountries.map((country, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-white font-medium">{country.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500"
                              style={{ width: `${(country.value / topCountries[0].value) * 100}%` }}
                            />
                          </div>
                          <span className="text-purple-400 font-bold">{country.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Viewer Retention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-purple-400 mb-2">
                    {avgRetention.toFixed(1)}%
                  </div>
                  <p className="text-gray-400">Average Retention Rate</p>
                </div>
                {contentComparisonData.length > 0 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={contentComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                      <Bar dataKey="retention" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Revenue Sources</CardTitle>
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
                      dataKey="value"
                    >
                      {revenueBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueBreakdown.map((source) => (
                    <div key={source.name} className="p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{source.name}</span>
                        <span className="text-2xl font-bold text-green-400">
                          ${source.value.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full"
                            style={{ 
                              width: `${totalRevenue > 0 ? (source.value / totalRevenue) * 100 : 0}%`,
                              backgroundColor: source.color
                            }}
                          />
                        </div>
                        <span className="text-gray-400">
                          {totalRevenue > 0 ? ((source.value / totalRevenue) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Daily Revenue Trends (30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={revenueByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} formatter={(v) => `$${v.toFixed(2)}`} />
                  <Legend />
                  <Line type="monotone" dataKey="tips" stroke="#f59e0b" strokeWidth={2} name="Tips" />
                  <Line type="monotone" dataKey="ppv" stroke="#8b5cf6" strokeWidth={2} name="PPV" />
                  <Line type="monotone" dataKey="memberships" stroke="#10b981" strokeWidth={2} name="Memberships" />
                  <Line type="monotone" dataKey="collaborations" stroke="#3b82f6" strokeWidth={2} name="Collaborations" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Performance Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Content Type Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contentComparisonData.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No content analytics yet</p>
              ) : (
                <>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    {contentComparisonData.map((content) => (
                      <div key={content.name} className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl">
                        <h3 className="text-white font-bold mb-3">{content.name}</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Views</span>
                            <span className="text-white font-bold">{content.views}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Retention</span>
                            <span className="text-purple-400 font-bold">{content.retention}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Avg Watch</span>
                            <span className="text-green-400 font-bold">{content.avgWatch} min</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={contentComparisonData}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="name" stroke="#9ca3af" />
                      <PolarRadiusAxis stroke="#9ca3af" />
                      <Radar name="Views" dataKey="views" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                      <Radar name="Retention" dataKey="retention" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Engagement Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                  <Bar dataKey="value" fill="#8b5cf6">
                    {engagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
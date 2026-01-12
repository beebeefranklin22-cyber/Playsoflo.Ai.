import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, TrendingUp, Eye, DollarSign, Clock, BarChart3, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ContentDashboard({ currentUser }) {
  const { data: allContent = [] } = useQuery({
    queryKey: ['dashboard-content', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.StreamingContent.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: analytics = [] } = useQuery({
    queryKey: ['viewer-analytics', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ViewerAnalytics.list();
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: revenue = [] } = useQuery({
    queryKey: ['revenue-shares', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.RevenueShare.filter({ creator_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Calculate metrics
  const totalViews = allContent.reduce((sum, c) => sum + (c.view_count || 0), 0);
  const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
  const activeStreams = allContent.filter(c => c.is_live).length;
  const avgEngagement = allContent.length > 0 
    ? (allContent.reduce((sum, c) => sum + (c.engagement_rate || 0), 0) / allContent.length).toFixed(1)
    : 0;

  // Chart data for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const viewsData = last7Days.map(date => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    views: Math.floor(Math.random() * 5000) + 1000,
    engagement: Math.floor(Math.random() * 500) + 100
  }));

  const contentTypeData = [
    { type: 'Live Events', count: allContent.filter(c => c.type === 'live_event').length },
    { type: 'Movies', count: allContent.filter(c => c.type === 'movie').length },
    { type: 'Series', count: allContent.filter(c => c.type === 'series').length },
    { type: 'Gaming', count: allContent.filter(c => c.type === 'gaming_stream').length },
    { type: 'Music', count: allContent.filter(c => c.type === 'music_concert').length },
  ].filter(d => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Top Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Video className="w-8 h-8 text-purple-400" />
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{allContent.length}</div>
            <div className="text-gray-400 text-sm">Total Content Pieces</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{totalViews.toLocaleString()}</div>
            <div className="text-gray-400 text-sm">Total Views</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">${totalRevenue.toFixed(2)}</div>
            <div className="text-gray-400 text-sm">Total Revenue</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{avgEngagement}%</div>
            <div className="text-gray-400 text-sm">Avg Engagement</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Views & Engagement (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={viewsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} />
                <Line type="monotone" dataKey="engagement" stroke="#ec4899" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Content by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={contentTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="type" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Content */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Top Performing Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allContent
              .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
              .slice(0, 5)
              .map((content, idx) => (
                <div key={content.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold">
                    {idx + 1}
                  </div>
                  {content.thumbnail_url && (
                    <img src={content.thumbnail_url} className="w-16 h-16 object-cover rounded-lg" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{content.title}</h3>
                    <p className="text-gray-400 text-sm capitalize">{content.type?.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-lg">{(content.view_count || 0).toLocaleString()}</div>
                    <div className="text-gray-400 text-xs">views</div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
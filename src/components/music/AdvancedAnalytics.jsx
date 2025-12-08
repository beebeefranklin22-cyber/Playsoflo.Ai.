import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Users, Play, Download, DollarSign, MapPin, Clock, Calendar } from "lucide-react";

export default function AdvancedAnalytics({ tracks, fanPools }) {
  const [timeRange, setTimeRange] = useState("30d");

  // Calculate total metrics
  const totalStreams = tracks.reduce((sum, t) => sum + (t.stream_count || 0), 0);
  const totalDownloads = tracks.reduce((sum, t) => sum + (t.download_count || 0), 0);
  const totalRevenue = tracks.reduce((sum, t) => sum + (t.revenue_generated || 0), 0);
  const totalFans = new Set(tracks.flatMap(t => t.listeners || [])).size;

  // Mock data for charts - in real app, fetch from backend
  const streamTrendData = [
    { date: "Week 1", streams: 1200, downloads: 45 },
    { date: "Week 2", streams: 1800, downloads: 67 },
    { date: "Week 3", streams: 2400, downloads: 89 },
    { date: "Week 4", streams: 3200, downloads: 125 }
  ];

  const topTracksData = tracks
    .sort((a, b) => (b.stream_count || 0) - (a.stream_count || 0))
    .slice(0, 5)
    .map(t => ({ name: t.title, streams: t.stream_count || 0, revenue: t.revenue_generated || 0 }));

  const demographicData = [
    { age: "18-24", listeners: 3500 },
    { age: "25-34", listeners: 4800 },
    { age: "35-44", listeners: 2100 },
    { age: "45-54", listeners: 900 },
    { age: "55+", listeners: 400 }
  ];

  const genderData = [
    { name: "Male", value: 5200, color: "#3b82f6" },
    { name: "Female", value: 4800, color: "#ec4899" },
    { name: "Other", value: 1700, color: "#8b5cf6" }
  ];

  const topLocations = [
    { city: "Los Angeles", streams: 4200, percentage: 18 },
    { city: "Miami", streams: 3800, percentage: 16 },
    { city: "New York", streams: 3400, percentage: 15 },
    { city: "Atlanta", streams: 2900, percentage: 12 },
    { city: "Houston", streams: 2100, percentage: 9 }
  ];

  const engagementData = tracks.map(t => ({
    track: t.title,
    completion_rate: Math.random() * 40 + 60,
    replay_rate: Math.random() * 30 + 10,
    save_rate: Math.random() * 25 + 5
  }));

  const revenueBreakdown = [
    { source: "Streams", amount: totalRevenue * 0.6, color: "#10b981" },
    { source: "Downloads", amount: totalRevenue * 0.25, color: "#3b82f6" },
    { source: "Licensing", amount: totalRevenue * 0.10, color: "#f59e0b" },
    { source: "Fan Pools", amount: totalRevenue * 0.05, color: "#8b5cf6" }
  ];

  const MetricCard = ({ title, value, change, icon: Icon, color }) => (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {change && (
            <Badge className={change > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
              {change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(change)}%
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-gray-400 text-sm">{title}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {["7d", "30d", "90d", "1y", "all"].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              timeRange === range
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {range === "all" ? "All Time" : range.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Streams"
          value={totalStreams.toLocaleString()}
          change={23.5}
          icon={Play}
          color="bg-purple-600"
        />
        <MetricCard
          title="Total Downloads"
          value={totalDownloads.toLocaleString()}
          change={18.2}
          icon={Download}
          color="bg-blue-600"
        />
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(0)}`}
          change={31.8}
          icon={DollarSign}
          color="bg-green-600"
        />
        <MetricCard
          title="Unique Listeners"
          value={totalFans.toLocaleString()}
          change={12.4}
          icon={Users}
          color="bg-pink-600"
        />
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-white/10">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Streams & Downloads Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={streamTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="streams" stroke="#8b5cf6" strokeWidth={2} />
                  <Line type="monotone" dataKey="downloads" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Top Performing Tracks</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topTracksData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  <Bar dataKey="streams" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Age Demographics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={demographicData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="age" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="listeners" fill="#ec4899" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Revenue by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={revenueBreakdown} dataKey="amount" nameKey="source" cx="50%" cy="50%" outerRadius={80} label>
                      {revenueBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {revenueBreakdown.map((item) => (
                  <div key={item.source} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-300">{item.source}</span>
                    </div>
                    <span className="text-white font-bold">${item.amount.toFixed(0)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Track Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {engagementData.slice(0, 5).map((track) => (
                  <div key={track.track} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{track.track}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400">Completion</span>
                          <span className="text-green-400">{track.completion_rate.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${track.completion_rate}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400">Replay</span>
                          <span className="text-blue-400">{track.replay_rate.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${track.replay_rate}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400">Saves</span>
                          <span className="text-purple-400">{track.save_rate.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500" style={{ width: `${track.save_rate}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Top Listening Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topLocations.map((location, idx) => (
                  <div key={location.city} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                      {idx + 1}
                    </div>
                    <MapPin className="w-5 h-5 text-purple-400" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">{location.city}</span>
                        <span className="text-gray-400">{location.streams.toLocaleString()} streams</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-600" style={{ width: `${location.percentage}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
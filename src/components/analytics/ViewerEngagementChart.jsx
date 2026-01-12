import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Eye, Clock, TrendingUp, Users } from "lucide-react";

const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

export default function ViewerEngagementChart({ analytics, timeRange = "7d" }) {
  // Calculate engagement metrics
  const totalViews = analytics.length;
  const totalWatchTime = analytics.reduce((sum, a) => sum + (a.watch_time_seconds || 0), 0);
  const avgWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;
  const avgCompletionRate = analytics.length > 0 
    ? analytics.reduce((sum, a) => sum + (a.completion_rate || 0), 0) / analytics.length 
    : 0;

  // Group by date
  const dailyData = analytics.reduce((acc, item) => {
    const date = new Date(item.created_date).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, views: 0, watchTime: 0, viewers: new Set() };
    }
    acc[date].views++;
    acc[date].watchTime += item.watch_time_seconds || 0;
    acc[date].viewers.add(item.viewer_email);
    return acc;
  }, {});

  const chartData = Object.values(dailyData).map(d => ({
    date: d.date,
    views: d.views,
    watchTimeHours: (d.watchTime / 3600).toFixed(1),
    uniqueViewers: d.viewers.size
  })).slice(-7);

  // Content type breakdown
  const contentTypeData = analytics.reduce((acc, item) => {
    const type = item.content_type || 'other';
    if (!acc[type]) {
      acc[type] = { name: type, value: 0 };
    }
    acc[type].value++;
    return acc;
  }, {});

  const pieData = Object.values(contentTypeData);

  // Retention data
  const retentionBuckets = [
    { range: '0-25%', count: 0 },
    { range: '25-50%', count: 0 },
    { range: '50-75%', count: 0 },
    { range: '75-100%', count: 0 }
  ];

  analytics.forEach(a => {
    const rate = a.completion_rate || 0;
    if (rate <= 25) retentionBuckets[0].count++;
    else if (rate <= 50) retentionBuckets[1].count++;
    else if (rate <= 75) retentionBuckets[2].count++;
    else retentionBuckets[3].count++;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Views</p>
                <p className="text-white text-3xl font-bold">{totalViews.toLocaleString()}</p>
              </div>
              <Eye className="w-10 h-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Watch Time</p>
                <p className="text-white text-3xl font-bold">{(totalWatchTime / 3600).toFixed(0)}h</p>
              </div>
              <Clock className="w-10 h-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg. Duration</p>
                <p className="text-white text-3xl font-bold">{(avgWatchTime / 60).toFixed(1)}m</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg. Retention</p>
                <p className="text-white text-3xl font-bold">{avgCompletionRate.toFixed(0)}%</p>
              </div>
              <Users className="w-10 h-10 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Views & Watch Time */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Daily Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="#8B5CF6" strokeWidth={2} name="Views" />
                <Line type="monotone" dataKey="watchTimeHours" stroke="#EC4899" strokeWidth={2} name="Watch Time (hrs)" />
                <Line type="monotone" dataKey="uniqueViewers" stroke="#10B981" strokeWidth={2} name="Unique Viewers" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Content Type Distribution */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Views by Content Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Viewer Retention */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Viewer Retention Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={retentionBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="range" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
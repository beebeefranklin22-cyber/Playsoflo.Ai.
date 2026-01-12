import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MapPin, Users, UserPlus, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#F43F5E'];

export default function AudienceDemographics({ analytics, followers, userInterests }) {
  // Location breakdown
  const locationData = analytics.reduce((acc, item) => {
    const country = item.viewer_country || 'Unknown';
    if (!acc[country]) {
      acc[country] = { country, count: 0 };
    }
    acc[country].count++;
    return acc;
  }, {});

  const topLocations = Object.values(locationData)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // New vs Returning Viewers
  const newViewers = analytics.filter(a => a.is_new_viewer).length;
  const returningViewers = analytics.length - newViewers;
  const viewerTypeData = [
    { name: 'New Viewers', value: newViewers },
    { name: 'Returning Viewers', value: returningViewers }
  ];

  // Audience interests
  const interestCounts = {};
  (userInterests || []).forEach(ui => {
    (ui.interests || []).forEach(interest => {
      interestCounts[interest] = (interestCounts[interest] || 0) + 1;
    });
  });

  const topInterests = Object.entries(interestCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([interest, count]) => ({ interest, count }));

  // Follower growth (mock data - would be from actual follower history)
  const followerGrowth = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
    followers: Math.floor((followers?.length || 0) * (0.7 + (i / 30) * 0.3))
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Followers</p>
                <p className="text-white text-3xl font-bold">{(followers?.length || 0).toLocaleString()}</p>
              </div>
              <Users className="w-10 h-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">New Viewers</p>
                <p className="text-white text-3xl font-bold">{newViewers}</p>
              </div>
              <UserPlus className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Returning Viewers</p>
                <p className="text-white text-3xl font-bold">{returningViewers}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Countries Reached</p>
                <p className="text-white text-3xl font-bold">{topLocations.length}</p>
              </div>
              <MapPin className="w-10 h-10 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Location Distribution */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Top Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topLocations} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#999" />
                <YAxis dataKey="country" type="category" stroke="#999" width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* New vs Returning */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Viewer Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={viewerTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {viewerTypeData.map((entry, index) => (
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

        {/* Top Interests */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Audience Interests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topInterests.map((item, index) => (
                <div key={item.interest} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <Badge className="bg-white/10 text-white capitalize">
                      {item.interest}
                    </Badge>
                  </div>
                  <span className="text-white font-semibold">{item.count} viewers</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Follower Growth */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Follower Growth (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={followerGrowth.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="followers" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, Users, Star, Calendar, Clock, 
  DollarSign, CheckCircle, XCircle, BarChart3
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PerformanceDashboard({ currentUser }) {
  const { data: bookings = [] } = useQuery({
    queryKey: ['provider-bookings-performance', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.ServiceBooking.filter({
        provider_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const { data: services = [] } = useQuery({
    queryKey: ['provider-services', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.MarketplaceItem.list();
    },
    enabled: !!currentUser
  });

  // Calculate metrics
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
  const completionRate = totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : 0;
  
  const totalEarnings = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.total_price || 0), 0);
  
  const avgBookingValue = completedBookings > 0 ? totalEarnings / completedBookings : 0;
  
  const ratedBookings = bookings.filter(b => b.rating);
  const avgRating = ratedBookings.length > 0
    ? ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length
    : 5.0;

  // Booking status distribution
  const statusData = [
    { name: 'Completed', value: completedBookings, color: '#22c55e' },
    { name: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: '#3b82f6' },
    { name: 'Pending', value: bookings.filter(b => b.status === 'pending').length, color: '#eab308' },
    { name: 'Cancelled', value: cancelledBookings, color: '#ef4444' }
  ].filter(d => d.value > 0);

  // Service performance
  const servicePerformance = services.map(service => {
    const serviceBookings = bookings.filter(b => b.service_id === service.id);
    const revenue = serviceBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.total_price || 0), 0);
    
    return {
      name: service.title,
      bookings: serviceBookings.length,
      revenue
    };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
          <CardContent className="p-6">
            <Calendar className="w-8 h-8 text-purple-400 mb-2" />
            <div className="text-3xl font-bold text-white mb-1">{totalBookings}</div>
            <div className="text-purple-300 text-sm">Total Bookings</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
            <div className="text-3xl font-bold text-white mb-1">{completionRate}%</div>
            <div className="text-green-300 text-sm">Completion Rate</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30">
          <CardContent className="p-6">
            <Star className="w-8 h-8 text-yellow-400 mb-2" />
            <div className="text-3xl font-bold text-white mb-1">{avgRating.toFixed(1)}</div>
            <div className="text-yellow-300 text-sm">Avg Rating</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
          <CardContent className="p-6">
            <DollarSign className="w-8 h-8 text-blue-400 mb-2" />
            <div className="text-3xl font-bold text-white mb-1">${avgBookingValue.toFixed(0)}</div>
            <div className="text-blue-300 text-sm">Avg Booking Value</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Booking Status Distribution */}
        {statusData.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Booking Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Performing Services */}
        {servicePerformance.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Top Services by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={servicePerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                  <Bar dataKey="revenue" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Stats */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">{services.length}</div>
              <div className="text-gray-400 text-sm">Active Services</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {bookings.filter(b => new Date(b.booking_date) > new Date()).length}
              </div>
              <div className="text-gray-400 text-sm">Upcoming Bookings</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {ratedBookings.length}
              </div>
              <div className="text-gray-400 text-sm">Customer Reviews</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
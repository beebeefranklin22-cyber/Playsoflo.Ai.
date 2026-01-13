import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, DollarSign, Calendar } from "lucide-react";

export default function AdvancedAnalytics({ currentUser }) {
  const { data: allBookings = [] } = useQuery({
    queryKey: ['provider-all-bookings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const bookings = await base44.entities.ServiceBooking.filter({
        provider_email: currentUser.email
      });
      const carRentals = await base44.entities.CarRental.filter({
        provider_email: currentUser.email
      });
      const propertyBookings = await base44.entities.Booking.filter({
        host_email: currentUser.email
      });
      return [...bookings, ...carRentals, ...propertyBookings];
    },
    enabled: !!currentUser
  });

  const { data: services = [] } = useQuery({
    queryKey: ['provider-services-analytics'],
    queryFn: () => base44.entities.MarketplaceItem.list(),
    initialData: []
  });

  // Service popularity over time (last 6 months)
  const servicePopularity = useMemo(() => {
    const last6Months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      const monthBookings = allBookings.filter(b => {
        const bookingDate = new Date(b.booking_date || b.start_date || b.created_date);
        return bookingDate.getMonth() === date.getMonth() && 
               bookingDate.getFullYear() === date.getFullYear();
      });

      last6Months.push({
        month: monthName,
        bookings: monthBookings.length,
        revenue: monthBookings.reduce((sum, b) => sum + (b.total_price || b.total_amount || 0), 0)
      });
    }
    
    return last6Months;
  }, [allBookings]);

  // Booking trends by category
  const categoryTrends = useMemo(() => {
    const categories = {};
    
    services.forEach(service => {
      const category = service.category || 'other';
      const serviceBookings = allBookings.filter(b => 
        b.service_id === service.id || b.experience_id === service.id
      );
      
      if (!categories[category]) {
        categories[category] = { name: category, bookings: 0, revenue: 0 };
      }
      
      categories[category].bookings += serviceBookings.length;
      categories[category].revenue += serviceBookings.reduce((sum, b) => 
        sum + (b.total_price || b.total_amount || 0), 0
      );
    });

    return Object.values(categories).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [services, allBookings]);

  // Customer demographics (booking frequency)
  const customerDemographics = useMemo(() => {
    const customers = {};
    
    allBookings.forEach(booking => {
      const email = booking.customer_email || booking.renter_email || booking.guest_email;
      if (!email) return;
      
      if (!customers[email]) {
        customers[email] = { email, bookings: 0, totalSpent: 0 };
      }
      
      customers[email].bookings += 1;
      customers[email].totalSpent += (booking.total_price || booking.total_amount || 0);
    });

    const customerList = Object.values(customers);
    
    // Group by frequency
    const oneTime = customerList.filter(c => c.bookings === 1).length;
    const returning = customerList.filter(c => c.bookings >= 2 && c.bookings <= 5).length;
    const loyal = customerList.filter(c => c.bookings > 5).length;

    return [
      { name: 'One-Time', value: oneTime, color: '#8B5CF6' },
      { name: 'Returning', value: returning, color: '#EC4899' },
      { name: 'Loyal', value: loyal, color: '#10B981' }
    ];
  }, [allBookings]);

  // Average revenue metrics
  const revenueMetrics = useMemo(() => {
    const completed = allBookings.filter(b => b.status === 'completed');
    const totalRevenue = completed.reduce((sum, b) => sum + (b.total_price || b.total_amount || 0), 0);
    
    return {
      avgPerBooking: completed.length > 0 ? totalRevenue / completed.length : 0,
      totalRevenue,
      completedBookings: completed.length,
      conversionRate: allBookings.length > 0 ? (completed.length / allBookings.length) * 100 : 0
    };
  }, [allBookings]);

  const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">${revenueMetrics.avgPerBooking.toFixed(0)}</div>
            <div className="text-purple-300 text-sm">Avg Revenue/Booking</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-600/20 to-pink-800/20 border-pink-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-pink-400" />
            </div>
            <div className="text-2xl font-bold text-white">{revenueMetrics.conversionRate.toFixed(1)}%</div>
            <div className="text-pink-300 text-sm">Completion Rate</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{customerDemographics.reduce((sum, d) => sum + d.value, 0)}</div>
            <div className="text-blue-300 text-sm">Total Customers</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">{revenueMetrics.completedBookings}</div>
            <div className="text-green-300 text-sm">Completed Bookings</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Revenue & Booking Trends (6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={servicePopularity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="month" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2} name="Revenue ($)" />
              <Line type="monotone" dataKey="bookings" stroke="#EC4899" strokeWidth={2} name="Bookings" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Performance */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Performance by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="name" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#8B5CF6" name="Revenue ($)" />
              <Bar dataKey="bookings" fill="#EC4899" name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Customer Segments */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Customer Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={customerDemographics}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {customerDemographics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {customerDemographics.map((segment) => (
                <div key={segment.name} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: segment.color }} />
                  <div>
                    <div className="text-white font-medium">{segment.name}</div>
                    <div className="text-gray-400 text-sm">{segment.value} customers</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
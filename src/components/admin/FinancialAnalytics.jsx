import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, CreditCard, ArrowUp, ArrowDown } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function FinancialAnalytics() {
  const { data: payments = [] } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const allPayments = await base44.asServiceRole.entities.Payment.list('-created_date', 1000);
      return allPayments;
    }
  });

  const { data: rides = [] } = useQuery({
    queryKey: ['admin-rides-financial'],
    queryFn: async () => {
      const allRides = await base44.asServiceRole.entities.RideRequest.filter({
        status: 'completed'
      });
      return allRides;
    }
  });

  // Calculate metrics
  const totalRevenue = rides.reduce((sum, r) => sum + (r.fare_breakdown?.total_fare || 0), 0);
  const totalDriverEarnings = rides.reduce((sum, r) => sum + (r.driver_earnings || 0), 0);
  const platformFees = totalRevenue - totalDriverEarnings;
  const avgRideFare = rides.length > 0 ? totalRevenue / rides.length : 0;

  // Daily revenue trend
  const last7Days = [...Array(7)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayRides = rides.filter(r => {
      const rideDate = new Date(r.end_time || r.created_date);
      return rideDate.toDateString() === date.toDateString();
    });
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: dayRides.reduce((sum, r) => sum + (r.fare_breakdown?.total_fare || 0), 0),
      rides: dayRides.length
    };
  });

  // Payment method distribution
  const paymentMethods = payments.reduce((acc, p) => {
    const method = p.method || 'internal_transfer';
    acc[method] = (acc[method] || 0) + Math.abs(p.amount_usd || 0);
    return acc;
  }, {});

  const paymentData = Object.entries(paymentMethods).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value: parseFloat(value.toFixed(2))
  }));

  const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-purple-400" />
              <Badge className="bg-green-500">
                <ArrowUp className="w-3 h-3 mr-1" />
                12%
              </Badge>
            </div>
            <div className="text-3xl font-bold text-white">${totalRevenue.toFixed(2)}</div>
            <div className="text-gray-400 text-sm">Total Revenue</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-blue-400" />
              <Badge className="bg-orange-500">
                <ArrowUp className="w-3 h-3 mr-1" />
                8%
              </Badge>
            </div>
            <div className="text-3xl font-bold text-white">${platformFees.toFixed(2)}</div>
            <div className="text-gray-400 text-sm">Platform Fees</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white">${totalDriverEarnings.toFixed(2)}</div>
            <div className="text-gray-400 text-sm">Driver Earnings</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-8 h-8 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-white">${avgRideFare.toFixed(2)}</div>
            <div className="text-gray-400 text-sm">Avg Ride Fare</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Revenue Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: $${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {payments.slice(0, 10).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">{payment.memo || 'Transaction'}</div>
                  <div className="text-gray-400 text-xs">
                    {new Date(payment.created_date).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${payment.amount_usd > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {payment.amount_usd > 0 ? '+' : ''}{payment.amount_usd?.toFixed(2) || '0.00'}
                  </div>
                  <Badge className="text-xs">{payment.method}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
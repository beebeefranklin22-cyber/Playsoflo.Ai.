import React from "react";
import { DollarSign, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PropertyAnalytics({ leases, payments, maintenanceRequests }) {
  const totalMonthlyRevenue = leases
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + (l.monthly_rent || 0), 0);

  const paymentsThisMonth = payments.filter(p => {
    const paymentDate = new Date(p.payment_date);
    const now = new Date();
    return paymentDate.getMonth() === now.getMonth() && 
           paymentDate.getFullYear() === now.getFullYear();
  });

  const collectedThisMonth = paymentsThisMonth
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingRequests = maintenanceRequests.filter(r => 
    r.status === 'submitted' || r.status === 'acknowledged'
  );

  const avgResponseTime = maintenanceRequests
    .filter(r => r.status === 'completed' && r.completed_date)
    .reduce((acc, r, idx, arr) => {
      const created = new Date(r.created_date).getTime();
      const completed = new Date(r.completed_date).getTime();
      const days = (completed - created) / (1000 * 60 * 60 * 24);
      return acc + days / arr.length;
    }, 0);

  const occupancyRate = leases.length > 0
    ? (leases.filter(l => l.status === 'active').length / leases.length) * 100
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-emerald-600 to-green-600 border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-white/80 text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Monthly Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-white">${totalMonthlyRevenue.toLocaleString()}</p>
          <p className="text-white/70 text-xs mt-1">From {leases.filter(l => l.status === 'active').length} active leases</p>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-gray-400 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Collected This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-white">${collectedThisMonth.toLocaleString()}</p>
          <p className="text-gray-400 text-xs mt-1">
            {paymentsThisMonth.length} payment{paymentsThisMonth.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-gray-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Maintenance Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-white">{pendingRequests.length}</p>
          <p className="text-gray-400 text-xs mt-1">Pending action</p>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-gray-400 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Avg Response Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-white">
            {avgResponseTime > 0 ? avgResponseTime.toFixed(1) : '—'}
          </p>
          <p className="text-gray-400 text-xs mt-1">Days to complete</p>
        </CardContent>
      </Card>
    </div>
  );
}
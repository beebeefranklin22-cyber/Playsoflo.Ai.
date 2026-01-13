import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, Calendar, Star, TrendingUp, Clock, Users,
  CheckCircle, AlertCircle, Package, CreditCard
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function DashboardMetrics({ currentUser }) {
  const { data: bookings = [] } = useQuery({
    queryKey: ['provider-dashboard-bookings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ServiceBooking.filter({
        provider_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const { data: carRentals = [] } = useQuery({
    queryKey: ['provider-car-rentals', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.CarRental.filter({
        provider_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const { data: propertyBookings = [] } = useQuery({
    queryKey: ['provider-property-bookings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.Booking.filter({
        host_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['provider-reviews', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.UserReview.filter({
        provider_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  // Calculate metrics
  const allBookings = [...bookings, ...carRentals, ...propertyBookings];
  
  const totalEarnings = allBookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.total_amount || b.total_price || 0), 0);

  const pendingEarnings = allBookings
    .filter(b => b.status === 'confirmed' || b.status === 'active')
    .reduce((sum, b) => sum + (b.total_amount || b.total_price || 0), 0);

  const upcomingBookings = allBookings.filter(b => {
    const bookingDate = new Date(b.booking_date || b.start_date);
    return bookingDate >= new Date() && ['pending', 'confirmed'].includes(b.status);
  }).length;

  const completedCount = allBookings.filter(b => b.status === 'completed').length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : 0;

  const completionRate = allBookings.length > 0
    ? ((completedCount / allBookings.length) * 100).toFixed(0)
    : 0;

  const stripeConnected = !!currentUser?.stripe_account_id;

  const metrics = [
    {
      label: "Total Earnings",
      value: `$${totalEarnings.toFixed(0)}`,
      icon: DollarSign,
      bgColor: "from-green-600/20 to-emerald-600/20",
      iconColor: "text-green-400",
      badge: "Completed",
      badgeColor: "bg-green-500/30 text-green-300"
    },
    {
      label: "Pending Revenue",
      value: `$${pendingEarnings.toFixed(0)}`,
      icon: Clock,
      bgColor: "from-yellow-600/20 to-orange-600/20",
      iconColor: "text-yellow-400",
      badge: "In Progress",
      badgeColor: "bg-yellow-500/30 text-yellow-300"
    },
    {
      label: "Upcoming Bookings",
      value: upcomingBookings,
      icon: Calendar,
      bgColor: "from-blue-600/20 to-cyan-600/20",
      iconColor: "text-blue-400",
      badge: "Scheduled",
      badgeColor: "bg-blue-500/30 text-blue-300"
    },
    {
      label: "Average Rating",
      value: avgRating > 0 ? avgRating : 'N/A',
      icon: Star,
      bgColor: "from-purple-600/20 to-pink-600/20",
      iconColor: "text-purple-400",
      badge: `${reviews.length} reviews`,
      badgeColor: "bg-purple-500/30 text-purple-300"
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      icon: CheckCircle,
      bgColor: "from-teal-600/20 to-cyan-600/20",
      iconColor: "text-teal-400",
      badge: `${completedCount} completed`,
      badgeColor: "bg-teal-500/30 text-teal-300"
    },
    {
      label: "Total Bookings",
      value: allBookings.length,
      icon: Users,
      bgColor: "from-indigo-600/20 to-blue-600/20",
      iconColor: "text-indigo-400",
      badge: "All time",
      badgeColor: "bg-indigo-500/30 text-indigo-300"
    },
    {
      label: "Payout Status",
      value: stripeConnected ? "Connected" : "Not Setup",
      icon: CreditCard,
      bgColor: stripeConnected ? "from-green-600/20 to-emerald-600/20" : "from-red-600/20 to-orange-600/20",
      iconColor: stripeConnected ? "text-green-400" : "text-red-400",
      badge: stripeConnected ? "Active" : "Action Needed",
      badgeColor: stripeConnected ? "bg-green-500/30 text-green-300" : "bg-red-500/30 text-red-300"
    },
    {
      label: "Services Listed",
      value: currentUser?.provider_services_count || 0,
      icon: Package,
      bgColor: "from-violet-600/20 to-purple-600/20",
      iconColor: "text-violet-400",
      badge: "Active",
      badgeColor: "bg-violet-500/30 text-violet-300"
    }
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className={`bg-gradient-to-br ${metric.bgColor} border-white/10`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <metric.icon className={`w-8 h-8 ${metric.iconColor}`} />
              <Badge className={`${metric.badgeColor} border-0`}>
                {metric.badge}
              </Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{metric.value}</div>
            <div className={`${metric.iconColor} text-sm`}>{metric.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
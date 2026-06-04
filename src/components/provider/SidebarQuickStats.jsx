import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function SidebarQuickStats({ currentUser }) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: foodOrders = [] } = useQuery({
    queryKey: ['sidebar-food-orders', currentUser?.email],
    queryFn: () => base44.entities.FoodOrder.filter({ owner_email: currentUser.email }),
    enabled: !!currentUser?.is_restaurant_owner,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const { data: serviceBookings = [] } = useQuery({
    queryKey: ['sidebar-service-bookings', currentUser?.email],
    queryFn: () => base44.entities.ServiceBooking.filter({ provider_email: currentUser.email }),
    enabled: !!currentUser?.is_provider,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const { data: rideRequests = [] } = useQuery({
    queryKey: ['sidebar-ride-requests', currentUser?.email],
    queryFn: () => base44.entities.RideRequest.filter({ driver_email: currentUser.email }),
    enabled: !!currentUser?.is_driver,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) >= startOfDay;
  };

  const allOrders = [...foodOrders, ...serviceBookings, ...rideRequests];
  const todaysOrders = allOrders.filter(o => isToday(o.created_date));
  const todaysRevenue = todaysOrders
    .filter(o => ['completed', 'confirmed', 'active'].includes(o.status))
    .reduce((sum, o) => sum + (o.total_amount || o.total_price || o.fare_breakdown?.total_fare || 0), 0);

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-gray-300">
        <span>Today's Orders</span>
        <span className="font-bold text-white">{todaysOrders.length}</span>
      </div>
      <div className="flex justify-between text-gray-300">
        <span>Revenue</span>
        <span className="font-bold text-green-400">${todaysRevenue.toFixed(2)}</span>
      </div>
    </div>
  );
}
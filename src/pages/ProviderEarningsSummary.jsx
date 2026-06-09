import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DollarSign, TrendingUp, Car, Home, Utensils, Music,
  Briefcase, Navigation, Package, ChevronLeft, BarChart3,
  ArrowUpRight, Clock, CheckCircle, Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CATEGORY_CONFIG = [
  {
    key: "services",
    label: "Services & Bookings",
    icon: Briefcase,
    color: "#8b5cf6",
    bgGrad: "from-violet-600/20 to-purple-600/20",
    borderColor: "border-violet-500/30",
    iconColor: "text-violet-400",
  },
  {
    key: "carRentals",
    label: "Car Rentals",
    icon: Car,
    color: "#f59e0b",
    bgGrad: "from-amber-600/20 to-yellow-600/20",
    borderColor: "border-amber-500/30",
    iconColor: "text-amber-400",
  },
  {
    key: "properties",
    label: "Property Hosting",
    icon: Home,
    color: "#06b6d4",
    bgGrad: "from-cyan-600/20 to-sky-600/20",
    borderColor: "border-cyan-500/30",
    iconColor: "text-cyan-400",
  },
  {
    key: "foodOrders",
    label: "Restaurant / Food",
    icon: Utensils,
    color: "#f97316",
    bgGrad: "from-orange-600/20 to-red-600/20",
    borderColor: "border-orange-500/30",
    iconColor: "text-orange-400",
  },
  {
    key: "rides",
    label: "Ride Driving",
    icon: Navigation,
    color: "#10b981",
    bgGrad: "from-emerald-600/20 to-green-600/20",
    borderColor: "border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
  {
    key: "delivery",
    label: "Delivery Orders",
    icon: Package,
    color: "#3b82f6",
    bgGrad: "from-blue-600/20 to-indigo-600/20",
    borderColor: "border-blue-500/30",
    iconColor: "text-blue-400",
  },
  {
    key: "music",
    label: "Music & Content",
    icon: Music,
    color: "#ec4899",
    bgGrad: "from-pink-600/20 to-rose-600/20",
    borderColor: "border-pink-500/30",
    iconColor: "text-pink-400",
  },
];

function fmt(n) {
  return (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProviderEarningsSummary() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // --- Data fetching ---
  const { data: serviceBookings = [], isLoading: loadingServices } = useQuery({
    queryKey: ["ps-services", currentUser?.email],
    queryFn: () => base44.entities.ServiceBooking.filter({ provider_email: currentUser.email }),
    enabled: !!currentUser,
    initialData: [],
  });

  const { data: carRentals = [], isLoading: loadingCars } = useQuery({
    queryKey: ["ps-cars", currentUser?.email],
    queryFn: () => base44.entities.CarRental.filter({ provider_email: currentUser.email }),
    enabled: !!currentUser,
    initialData: [],
  });

  const { data: propertyBookings = [], isLoading: loadingProps } = useQuery({
    queryKey: ["ps-properties", currentUser?.email],
    queryFn: () => base44.entities.Booking.filter({ host_email: currentUser.email }),
    enabled: !!currentUser,
    initialData: [],
  });

  const { data: foodOrders = [], isLoading: loadingFood } = useQuery({
    queryKey: ["ps-food", currentUser?.email],
    queryFn: () => base44.entities.FoodOrder.filter({ restaurant_owner_email: currentUser.email }),
    enabled: !!currentUser,
    initialData: [],
  });

  const { data: rideRequests = [], isLoading: loadingRides } = useQuery({
    queryKey: ["ps-rides", currentUser?.email],
    queryFn: () => base44.entities.RideRequest.filter({ driver_email: currentUser.email }),
    enabled: !!currentUser,
    initialData: [],
  });

  const { data: deliveryOrders = [], isLoading: loadingDelivery } = useQuery({
    queryKey: ["ps-delivery", currentUser?.email],
    queryFn: () => base44.entities.DeliveryOrder.filter({ driver_email: currentUser.email }),
    enabled: !!currentUser,
    initialData: [],
  });

  const { data: musicTracks = [], isLoading: loadingMusic } = useQuery({
    queryKey: ["ps-music", currentUser?.email],
    queryFn: () => base44.entities.MusicTrack.filter({ artist_email: currentUser.email }),
    enabled: !!currentUser,
    initialData: [],
  });

  const isLoading = loadingServices || loadingCars || loadingProps || loadingFood || loadingRides || loadingDelivery || loadingMusic;

  // --- Calculate earnings per category ---
  const calcEarnings = (items, amountField, statusFilter) => {
    return items
      .filter(i => !statusFilter || statusFilter.includes(i.status))
      .reduce((sum, i) => {
        const amt = typeof amountField === "function" ? amountField(i) : (i[amountField] || 0);
        return sum + amt;
      }, 0);
  };

  const categories = {
    services: {
      total: calcEarnings(serviceBookings, i => i.total_amount || i.total_price || 0, ["completed"]),
      pending: calcEarnings(serviceBookings, i => i.total_amount || i.total_price || 0, ["confirmed", "pending"]),
      count: serviceBookings.length,
      completedCount: serviceBookings.filter(i => i.status === "completed").length,
      items: serviceBookings,
    },
    carRentals: {
      total: calcEarnings(carRentals, i => i.total_price || i.total_amount || 0, ["completed"]),
      pending: calcEarnings(carRentals, i => i.total_price || i.total_amount || 0, ["active", "confirmed"]),
      count: carRentals.length,
      completedCount: carRentals.filter(i => i.status === "completed").length,
      items: carRentals,
    },
    properties: {
      total: calcEarnings(propertyBookings, i => i.total_price || i.total_amount || 0, ["completed"]),
      pending: calcEarnings(propertyBookings, i => i.total_price || i.total_amount || 0, ["confirmed", "active"]),
      count: propertyBookings.length,
      completedCount: propertyBookings.filter(i => i.status === "completed").length,
      items: propertyBookings,
    },
    foodOrders: {
      total: calcEarnings(foodOrders, "subtotal", ["delivered"]),
      pending: calcEarnings(foodOrders, "subtotal", ["preparing", "ready", "picked_up", "on_the_way"]),
      count: foodOrders.length,
      completedCount: foodOrders.filter(i => i.status === "delivered").length,
      items: foodOrders,
    },
    rides: {
      total: calcEarnings(rideRequests, i => i.fare_breakdown?.driver_earnings || 0, ["completed"]),
      pending: calcEarnings(rideRequests, i => i.fare_breakdown?.driver_earnings || 0, ["accepted", "en_route", "in_progress"]),
      count: rideRequests.length,
      completedCount: rideRequests.filter(i => i.status === "completed").length,
      items: rideRequests,
    },
    delivery: {
      total: calcEarnings(deliveryOrders, i => i.driver_earnings || i.delivery_fee || 0, ["delivered", "completed"]),
      pending: calcEarnings(deliveryOrders, i => i.driver_earnings || i.delivery_fee || 0, ["picked_up", "in_transit"]),
      count: deliveryOrders.length,
      completedCount: deliveryOrders.filter(i => ["delivered", "completed"].includes(i.status)).length,
      items: deliveryOrders,
    },
    music: {
      total: musicTracks.reduce((sum, t) => sum + (t.revenue_generated || 0), 0),
      pending: 0,
      count: musicTracks.length,
      completedCount: musicTracks.filter(t => t.status === "published").length,
      items: musicTracks,
    },
  };

  const grandTotal = Object.values(categories).reduce((s, c) => s + c.total, 0);
  const grandPending = Object.values(categories).reduce((s, c) => s + c.pending, 0);
  const grandCount = Object.values(categories).reduce((s, c) => s + c.count, 0);

  // --- Chart data ---
  const barData = CATEGORY_CONFIG
    .map(cfg => ({
      name: cfg.label.split(" ")[0],
      earned: parseFloat(categories[cfg.key].total.toFixed(2)),
      pending: parseFloat(categories[cfg.key].pending.toFixed(2)),
      fill: cfg.color,
    }))
    .filter(d => d.earned > 0 || d.pending > 0);

  const pieData = CATEGORY_CONFIG
    .map(cfg => ({ name: cfg.label, value: categories[cfg.key].total, color: cfg.color }))
    .filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-green-400" />
              Earnings Summary
            </h1>
            <p className="text-gray-400 text-sm">All revenue streams, in one place</p>
          </div>
          {isLoading && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Grand totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Earned", value: `$${fmt(grandTotal)}`, icon: DollarSign, color: "from-green-600/20 to-emerald-600/20 border-green-500/30", ic: "text-green-400" },
            { label: "Pending Revenue", value: `$${fmt(grandPending)}`, icon: Clock, color: "from-yellow-600/20 to-amber-600/20 border-yellow-500/30", ic: "text-yellow-400" },
            { label: "Total Transactions", value: grandCount, icon: TrendingUp, color: "from-blue-600/20 to-indigo-600/20 border-blue-500/30", ic: "text-blue-400" },
            { label: "Active Streams", value: CATEGORY_CONFIG.filter(c => categories[c.key].total > 0 || categories[c.key].pending > 0).length, icon: ArrowUpRight, color: "from-purple-600/20 to-pink-600/20 border-purple-500/30", ic: "text-purple-400" },
          ].map((m, i) => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className={`bg-gradient-to-br ${m.color} border`}>
                <CardContent className="p-5">
                  <m.icon className={`w-6 h-6 ${m.ic} mb-2`} />
                  <div className="text-2xl font-bold text-white">{m.value}</div>
                  <div className="text-gray-400 text-xs mt-1">{m.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/10 border border-white/20">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">By Category</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {CATEGORY_CONFIG.map((cfg, i) => {
              const cat = categories[cfg.key];
              if (cat.total === 0 && cat.pending === 0 && cat.count === 0) return null;
              const pct = grandTotal > 0 ? ((cat.total / grandTotal) * 100).toFixed(1) : 0;
              return (
                <motion.div key={cfg.key} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`bg-gradient-to-br ${cfg.bgGrad} border ${cfg.borderColor}`}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center`}>
                            <cfg.icon className={`w-5 h-5 ${cfg.iconColor}`} />
                          </div>
                          <div>
                            <p className="text-white font-semibold">{cfg.label}</p>
                            <p className="text-gray-400 text-xs">{cat.count} transactions · {cat.completedCount} completed</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold text-lg">${fmt(cat.total)}</div>
                          {cat.pending > 0 && (
                            <div className="text-yellow-400 text-xs">+${fmt(cat.pending)} pending</div>
                          )}
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                        />
                      </div>
                      <p className="text-gray-500 text-xs mt-1">{pct}% of total earnings</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            {grandTotal === 0 && grandPending === 0 && !isLoading && (
              <div className="text-center py-20">
                <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No earnings yet</h3>
                <p className="text-gray-400">Start offering services, listing properties, driving rides or uploading music to see your earnings here.</p>
              </div>
            )}
          </TabsContent>

          {/* BREAKDOWN TAB */}
          <TabsContent value="breakdown" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {CATEGORY_CONFIG.map(cfg => {
                const cat = categories[cfg.key];
                return (
                  <Card key={cfg.key} className={`bg-gradient-to-br ${cfg.bgGrad} border ${cfg.borderColor}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white text-base flex items-center gap-2">
                        <cfg.icon className={`w-4 h-4 ${cfg.iconColor}`} />
                        {cfg.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="text-green-400 font-bold">${fmt(cat.total)}</div>
                          <div className="text-gray-400 text-xs">Earned</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="text-yellow-400 font-bold">${fmt(cat.pending)}</div>
                          <div className="text-gray-400 text-xs">Pending</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="text-white font-bold">{cat.count}</div>
                          <div className="text-gray-400 text-xs">Total</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-400" /> {cat.completedCount} completed
                        </span>
                        <Badge className="bg-white/10 text-gray-300 text-xs border-0">
                          {cat.count - cat.completedCount} in progress
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* CHARTS TAB */}
          <TabsContent value="charts" className="mt-4 space-y-6">
            {barData.length > 0 ? (
              <>
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Earnings by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={barData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                        <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                          formatter={(v, name) => [`$${v}`, name === "earned" ? "Earned" : "Pending"]}
                        />
                        <Bar dataKey="earned" radius={[4, 4, 0, 0]} fill="#10b981" name="earned" />
                        <Bar dataKey="pending" radius={[4, 4, 0, 0]} fill="#f59e0b" name="pending" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {pieData.length > 0 && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Revenue Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                              {pieData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                              formatter={(v) => [`$${fmt(v)}`]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                          {pieData.map(d => (
                            <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-300">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                              <span>{d.name.split(" ")[0]}: ${fmt(d.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No earnings data to chart yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
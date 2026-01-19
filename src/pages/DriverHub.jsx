import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  DollarSign, TrendingUp, Clock, Star, Zap, Award,
  MapPin, ArrowUpRight, Activity, Target, Gift,
  Wallet, Calendar, BarChart3, Power, Bell, MessageCircle, User, Brain, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import RideRequestCard from "../components/driver/RideRequestCard";
import DriverLocationTracker from "../components/driver/DriverLocationTracker";
import RideChatModal from "../components/chat/RideChatModal";
import DriverProfileModal from "../components/driver/DriverProfileModal";
import NavigationModal from "../components/driver/NavigationModal";
import EarningsChart from "../components/driver/EarningsChart";
import AIDriverAssistant from "../components/driver/AIDriverAssistant";
import AIRouteOptimizer from "../components/driver/AIRouteOptimizer";
import AIPassengerMatcher from "../components/driver/AIPassengerMatcher";
import DisputeResolutionModal from "../components/driver/DisputeResolutionModal";
import RealTimeDriverMap from "../components/driver/RealTimeDriverMap";
import DriverStatsOverview from "../components/driver/DriverStatsOverview";

export default function DriverHub() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("today");
  const [isOnline, setIsOnline] = useState(false);
  const [chatRide, setChatRide] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [navRide, setNavRide] = useState(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [disputeRide, setDisputeRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setIsOnline(user.driver_is_online || false);
      
      // Set initial location from user data
      if (user.driver_current_lat && user.driver_current_lng) {
        setDriverLocation([user.driver_current_lat, user.driver_current_lng]);
      }
    }).catch(() => {});

    // Get driver's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = [position.coords.latitude, position.coords.longitude];
          setDriverLocation(loc);
        },
        (error) => console.log('Location error:', error),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const { data: todayStats } = useQuery({
    queryKey: ['driver-stats-today', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;
      const today = new Date().toISOString().split('T')[0];
      const stats = await base44.entities.DriverStats.filter({
        driver_email: currentUser.email,
        period_type: "daily",
        period_date: today
      });
      return stats[0] || {
        total_rides: 0,
        miles_driven: 0,
        hours_online: 0,
        gross_earnings: 0,
        net_earnings: 0,
        tips_earned: 0,
        bonuses_earned: 0,
        pending_payout: 0,
        hourly_rate: 0,
        streak_count: 0
      };
    },
    enabled: !!currentUser,
    refetchInterval: 30000, // Update every 30 seconds
    refetchOnWindowFocus: false
  });

  const { data: weeklyStats } = useQuery({
    queryKey: ['driver-stats-weekly', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;
      const stats = await base44.entities.DriverStats.filter({
        driver_email: currentUser.email,
        period_type: "weekly"
      });
      return stats[0] || {
        total_rides: 0,
        miles_driven: 0,
        hours_online: 0,
        gross_earnings: 0,
        net_earnings: 0,
        tips_earned: 0,
        bonuses_earned: 0
      };
    },
    enabled: !!currentUser
  });

  const { data: recentRides = [] } = useQuery({
    queryKey: ['driver-recent-rides', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.RideRequest.filter({
        driver_email: currentUser.email
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['pending-ride-requests', driverLocation],
    queryFn: async () => {
      try {
        const requests = await base44.entities.RideRequest.filter({
          status: "requested",
          driver_status: "pending"
        });

        // Calculate distance for each request if driver location available
        if (driverLocation && requests.length > 0) {
          const enrichedRequests = requests.map(ride => {
            if (ride.pickup_coords && Array.isArray(ride.pickup_coords)) {
              const R = 3959; // Earth's radius in miles
              const lat1 = driverLocation[0] * Math.PI / 180;
              const lat2 = ride.pickup_coords[0] * Math.PI / 180;
              const dLat = (ride.pickup_coords[0] - driverLocation[0]) * Math.PI / 180;
              const dLon = (ride.pickup_coords[1] - driverLocation[1]) * Math.PI / 180;
              
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                       Math.cos(lat1) * Math.cos(lat2) *
                       Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distance = R * c;
              
              return { ...ride, distance_to_pickup: distance };
            }
            return ride;
          });

          // Sort by distance (closest first)
          return enrichedRequests.sort((a, b) => {
            if (!a.distance_to_pickup) return 1;
            if (!b.distance_to_pickup) return -1;
            return a.distance_to_pickup - b.distance_to_pickup;
          });
        }
        
        return requests;
      } catch (err) {
        console.error("Error fetching pending requests:", err);
        return [];
      }
    },
    enabled: isOnline && !!currentUser,
    refetchInterval: isOnline ? 10000 : false, // Every 10 seconds when online
    staleTime: 5000,
    refetchOnWindowFocus: false,
    initialData: []
  });

  const { data: activeRides = [] } = useQuery({
    queryKey: ['driver-active-rides', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      try {
        return await base44.entities.RideRequest.filter({
          driver_email: currentUser.email,
          status: { $in: ["en_route", "accepted", "in_progress"] }
        });
      } catch (err) {
        console.error("Error fetching active rides:", err);
        return [];
      }
    },
    enabled: !!currentUser,
    refetchInterval: 8000, // Every 8 seconds
    staleTime: 5000,
    refetchOnWindowFocus: false,
    initialData: []
  });

  const toggleOnlineMutation = useMutation({
    mutationFn: async (online) => {
      await base44.auth.updateMe({ driver_is_online: online });
      return online;
    },
    onSuccess: (online) => {
      setIsOnline(online);
      queryClient.invalidateQueries(['pending-ride-requests']);
    }
  });

  const handleCashOut = async () => {
    const amount = todayStats?.pending_payout || 0;
    if (amount <= 0) {
      alert("No funds available for cash out");
      return;
    }

    // Create instant payout
    try {
      await base44.entities.Payment.create({
        amount_usd: amount,
        amount_rri: 0,
        method: "bank",
        status: "completed",
        reference_type: "other",
        reference_id: currentUser.id,
        memo: "Instant driver cash out"
      });

      // Update stats to reset pending payout
      if (todayStats) {
        await base44.entities.DriverStats.update(todayStats.id, {
          pending_payout: 0
        });
      }

      alert(`$${amount.toFixed(2)} cashed out successfully! Funds will arrive in 1-2 business days.`);
    } catch (error) {
      console.error("Cash out error:", error);
      alert("Cash out failed. Please try again.");
    }
  };

  const stats = activeTab === "today" ? todayStats : weeklyStats;
  const guaranteedHourly = 18; // $18/hour guaranteed minimum

  // Fetch driver ratings
  const { data: myRatings = [] } = useQuery({
    queryKey: ['driver-ratings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.Rating.filter({
        rated_email: currentUser.email,
        rater_type: "customer"
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const averageRating = myRatings.length > 0
    ? (myRatings.reduce((sum, r) => sum + r.rating, 0) / myRatings.length).toFixed(1)
    : 5.0;

  const activeRide = recentRides.find(r => r.status === "accepted" || r.status === "en_route");

  return (
    <>
      <DriverLocationTracker isOnline={isOnline} rideId={activeRide?.id} />
      <div className="min-h-screen p-6 bg-gradient-to-br from-green-950 via-emerald-950 to-green-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Activity className="w-10 h-10 text-green-400" />
                Driver Hub
              </h1>
              <p className="text-gray-300 text-lg">
                Track your earnings • Get 88-90% of every ride • Cash out instantly
              </p>
            </div>
            
            <div className="flex gap-2">
                              <Button
                                onClick={() => setShowAIAssistant(true)}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                <Brain className="w-4 h-4 mr-2" />
                                AI Assistant
                              </Button>
                              <Button
                                onClick={() => setShowProfile(true)}
                                variant="outline"
                                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                              >
                                <User className="w-4 h-4 mr-2" />
                                Profile
                              </Button>
                            </div>
            
            {/* Online/Offline Toggle */}
            <Card className={`${isOnline ? 'bg-green-600/20 border-green-500/30' : 'bg-gray-600/20 border-gray-500/30'}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-white font-bold text-lg mb-1">
                      {isOnline ? 'You\'re Online' : 'You\'re Offline'}
                    </div>
                    <div className="text-gray-300 text-sm">
                      {isOnline ? 'Accepting ride requests' : 'Not accepting rides'}
                    </div>
                  </div>
                  <Switch
                    checked={isOnline}
                    onCheckedChange={(checked) => toggleOnlineMutation.mutate(checked)}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
                {isOnline && pendingRequests.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-yellow-400 text-sm">
                    <Bell className="w-4 h-4 animate-pulse" />
                    {pendingRequests.length} new ride request{pendingRequests.length > 1 ? 's' : ''}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Quick Stats Overview */}
        <DriverStatsOverview 
          stats={todayStats} 
          rating={averageRating}
          isOnline={isOnline}
        />

        {/* Active Rides - High Priority */}
        {activeRides.length > 0 && (
          <div className="mb-6">
            <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
                  Active Rides
                  <Badge className="bg-blue-500 text-white animate-pulse">
                    {activeRides.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeRides.map(ride => (
                  <RideRequestCard
                    key={ride.id}
                    ride={ride}
                    onAccept={() => {
                      queryClient.invalidateQueries(['driver-active-rides']);
                      queryClient.invalidateQueries(['driver-recent-rides']);
                    }}
                    onNavigate={setNavRide}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Real-Time Map */}
        {isOnline && driverLocation && (
          <div className="mb-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-blue-400" />
                  Live Market Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RealTimeDriverMap 
                  currentUser={currentUser}
                  driverLocation={driverLocation}
                  isOnline={isOnline}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pending Ride Requests */}
        {isOnline && pendingRequests.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Bell className="w-6 h-6 text-yellow-400 animate-pulse" />
              New Ride Requests
              <Badge className="bg-red-500 text-white animate-pulse">
                {pendingRequests.length}
              </Badge>
            </h2>
            <AnimatePresence>
              <div className="space-y-4">
                {pendingRequests.map(request => (
                  <motion.div 
                    key={request.id} 
                    className="space-y-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    {request.distance_to_pickup && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-300 text-sm font-medium">
                            📍 {request.distance_to_pickup.toFixed(1)} miles away
                          </span>
                          <span className="text-blue-200 text-xs">
                            ~{Math.ceil(request.distance_to_pickup * 2)} min drive
                          </span>
                        </div>
                      </div>
                    )}
                    <RideRequestCard
                      ride={request}
                      onAccept={() => {
                        queryClient.invalidateQueries(['pending-ride-requests']);
                        queryClient.invalidateQueries(['driver-active-rides']);
                        toast.success('Ride accepted! Navigate to pickup location');
                      }}
                      onDecline={() => {
                        queryClient.invalidateQueries(['pending-ride-requests']);
                        toast.info('Ride declined');
                      }}
                      onNavigate={setNavRide}
                    />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </div>
        )}

        {/* No Requests Available */}
        {isOnline && pendingRequests.length === 0 && activeRides.length === 0 && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="p-8 text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Activity className="w-16 h-16 text-green-400 mx-auto mb-4" />
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-2">You're Online!</h3>
              <p className="text-gray-400 mb-4">
                Waiting for ride requests in your area...
              </p>
              <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Active and ready to receive requests</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Earnings Card */}
        <Card className="bg-gradient-to-br from-green-600 to-emerald-600 border-0 shadow-2xl mb-6">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <div className="text-white/80 text-sm mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Available to Cash Out
                </div>
                <div className="text-5xl font-bold text-white mb-2">
                  ${(stats?.pending_payout || 0).toFixed(2)}
                </div>
                <Button
                  onClick={handleCashOut}
                  className="w-full bg-white text-green-600 hover:bg-gray-100 font-bold"
                  disabled={!stats?.pending_payout || stats.pending_payout <= 0}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Instant Cash Out
                </Button>
                </div>

                {/* Dispute Resolution Access */}
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-white/80 text-sm mb-2">Need Help?</div>
                <Button
                  onClick={() => {
                    const lastRide = recentRides.find(r => r.status === 'completed');
                    if (lastRide) setDisputeRide(lastRide);
                    else toast.error("No completed rides to dispute");
                  }}
                  variant="outline"
                  className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  File a Dispute
                </Button>
                </div>

              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-white/80 text-sm mb-1">Today's Earnings</div>
                <div className="text-3xl font-bold text-white flex items-baseline gap-2">
                  ${(stats?.net_earnings || 0).toFixed(2)}
                  <span className="text-lg text-green-200">
                    +${(stats?.tips_earned || 0).toFixed(2)} tips
                  </span>
                </div>
                <div className="text-white/70 text-xs mt-1">
                  ${(stats?.gross_earnings || 0).toFixed(2)} gross • You keep 90%
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-white/80 text-sm mb-1">Hourly Rate</div>
                <div className="text-3xl font-bold text-white">
                  ${(stats?.hourly_rate || 0).toFixed(2)}/hr
                </div>
                <div className="text-white/70 text-xs mt-1">
                  Guaranteed minimum: ${guaranteedHourly}/hr
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-white/80 text-sm mb-1">Active Streak</div>
                <div className="text-3xl font-bold text-white flex items-center gap-2">
                  <Award className="w-8 h-8 text-yellow-400" />
                  {stats?.streak_count || 0}
                </div>
                <div className="text-white/70 text-xs mt-1">
                  {stats?.bonuses_earned ? `+$${stats.bonuses_earned.toFixed(2)} bonuses` : 'No bonuses yet'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="bonuses">Bonuses</TabsTrigger>
          </TabsList>

          {/* Today/Week Stats */}
          <TabsContent value={activeTab === "today" ? "today" : "week"} className="space-y-6">
            {/* Earnings Chart */}
            <EarningsChart />
            
            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <MapPin className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white mb-1">
                    {stats?.total_rides || 0}
                  </div>
                  <div className="text-gray-400 text-sm">Completed Rides</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Activity className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white mb-1">
                    {(stats?.miles_driven || 0).toFixed(1)}
                  </div>
                  <div className="text-gray-400 text-sm">Miles Driven</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Clock className="w-10 h-10 text-orange-400 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white mb-1">
                    {(stats?.hours_online || 0).toFixed(1)}
                  </div>
                  <div className="text-gray-400 text-sm">Hours Online</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Star className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white mb-1">
                    {averageRating}
                  </div>
                  <div className="text-gray-400 text-sm">Rating ({myRatings.length} reviews)</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Rides */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Recent Rides</CardTitle>
              </CardHeader>
              <CardContent>
                {recentRides.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">No rides yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentRides.slice(0, 10).map((ride) => (
                      <div key={ride.id} className="p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="w-4 h-4 text-blue-400" />
                              <span className="text-white font-medium text-sm">
                                {ride.pickup_address}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-xs">
                              <ArrowUpRight className="w-3 h-3" />
                              {ride.dropoff_address}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              {ride.status === 'completed' 
                                ? `${(ride.actual_distance || 0).toFixed(1)} mi • ${new Date(ride.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : `Status: ${ride.status}`
                              }
                            </div>
                          </div>
                          <div className="text-right">
                            {ride.status === 'completed' ? (
                              <>
                                <div className="text-green-400 font-bold text-lg">
                                  ${((ride.fare_breakdown?.total_fare || 0) * 0.9).toFixed(2)}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  You keep 90%
                                </div>
                              </>
                            ) : (
                              <Button
                                onClick={() => setChatRide(ride)}
                                size="sm"
                                variant="outline"
                                className="bg-purple-500/10 border-purple-500/30 text-purple-300"
                              >
                                <MessageCircle className="w-4 h-4 mr-1" />
                                Chat
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Earnings Breakdown */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Earnings Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-300">Ride Earnings (90%)</span>
                    <span className="text-white font-bold text-lg">
                      ${(stats?.net_earnings || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-300">Tips (100% yours)</span>
                    <span className="text-green-400 font-bold text-lg">
                      +${(stats?.tips_earned || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-300">Bonuses & Incentives</span>
                    <span className="text-yellow-400 font-bold text-lg">
                      +${(stats?.bonuses_earned || 0).toFixed(2)}
                    </span>
                  </div>
                  {stats?.guaranteed_minimum_applied > 0 && (
                    <div className="flex justify-between items-center p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                      <span className="text-green-300">Hourly Guarantee Top-up</span>
                      <span className="text-green-400 font-bold text-lg">
                        +${stats.guaranteed_minimum_applied.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white text-xl font-bold">Total Earnings</span>
                      <span className="text-white text-3xl font-bold">
                        ${((stats?.net_earnings || 0) + (stats?.tips_earned || 0) + (stats?.bonuses_earned || 0) + (stats?.guaranteed_minimum_applied || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bonuses Tab */}
          <TabsContent value="bonuses" className="space-y-6">
            <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Gift className="w-6 h-6 text-yellow-400" />
                  Active Bonuses & Incentives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white/10 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold">New Driver Bonus</span>
                    <Badge className="bg-green-500/30 text-green-200">Active</Badge>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    $100 after your first 7 completed rides
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(((stats?.total_rides || 0) / 7) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-white text-sm font-medium">
                      {Math.min(stats?.total_rides || 0, 7)}/7
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white/10 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold">Switch Bonus</span>
                    <Badge className="bg-blue-500/30 text-blue-200">Available</Badge>
                  </div>
                  <p className="text-gray-300 text-sm">
                    $50 after 10 rides if switching from Uber/Lyft
                  </p>
                </div>

                <div className="p-4 bg-white/10 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold">Hourly Guarantee</span>
                    <Badge className="bg-purple-500/30 text-purple-200">Active</Badge>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Earn minimum $18/hour, we'll top up the difference
                  </p>
                </div>

                <div className="p-4 bg-white/10 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold">Streak Bonus</span>
                    <Badge className="bg-orange-500/30 text-orange-200">Active</Badge>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    $5 bonus for every 10 rides completed without cancellation
                  </p>
                  <div className="text-yellow-400 font-bold">
                    Current streak: {stats?.streak_count || 0} rides
                  </div>
                </div>

                <div className="p-4 bg-white/10 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold">Peak Hours Multiplier</span>
                    <Badge className="bg-red-500/30 text-red-200">1.5x</Badge>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Earn 1.5x during rush hours: 7-9am, 5-7pm weekdays
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payout Settings */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Payout Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">
                    How often do you want to get paid?
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button className="p-4 bg-purple-500/20 border-2 border-purple-500 rounded-xl text-white font-semibold">
                      <Zap className="w-5 h-5 mx-auto mb-1" />
                      Instant
                    </button>
                    <button className="p-4 bg-white/10 border border-white/20 rounded-xl text-gray-300 hover:bg-white/20">
                      <Calendar className="w-5 h-5 mx-auto mb-1" />
                      Daily
                    </button>
                    <button className="p-4 bg-white/10 border border-white/20 rounded-xl text-gray-300 hover:bg-white/20">
                      <BarChart3 className="w-5 h-5 mx-auto mb-1" />
                      Weekly
                    </button>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-blue-300 text-sm">
                    <strong>Instant Cash Out:</strong> Get paid immediately after each ride. 
                    Small $0.50 fee per cash out.
                  </p>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <p className="text-green-300 text-sm">
                    <strong>Daily/Weekly:</strong> Free automatic deposits to your bank account.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Key Features */}
        <Card className="bg-white/5 border-white/10 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Why Drive with PlaySoFlo?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <DollarSign className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h3 className="text-white font-bold mb-2">Keep 88-90%</h3>
                <p className="text-gray-400 text-sm">
                  Industry-leading driver earnings. Plus 100% of tips.
                </p>
              </div>
              <div className="text-center p-4">
                <Target className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <h3 className="text-white font-bold mb-2">$18/hr Guaranteed</h3>
                <p className="text-gray-400 text-sm">
                  Minimum hourly wage guaranteed during active hours.
                </p>
              </div>
              <div className="text-center p-4">
                <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                <h3 className="text-white font-bold mb-2">Instant Cashout</h3>
                <p className="text-gray-400 text-sm">
                  Access your earnings anytime, instantly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Modal */}
      {chatRide && (
        <RideChatModal
          open={!!chatRide}
          onClose={() => setChatRide(null)}
          ride={chatRide}
        />
      )}

      {/* Profile Modal */}
      {showProfile && (
        <DriverProfileModal
          open={showProfile}
          onClose={() => setShowProfile(false)}
          currentUser={currentUser}
        />
      )}

      {/* Navigation Modal */}
      {navRide && (
        <NavigationModal
          open={!!navRide}
          onClose={() => setNavRide(null)}
          ride={navRide}
        />
      )}

      {/* AI Assistant */}
      <AIDriverAssistant
        open={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        currentUser={currentUser}
      />

      {/* Dispute Resolution */}
      {disputeRide && (
        <DisputeResolutionModal
          open={!!disputeRide}
          onClose={() => setDisputeRide(null)}
          ride={disputeRide}
        />
      )}
      </div>
      </>
      );
      }
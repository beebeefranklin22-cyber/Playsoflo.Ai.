import React, { useState, useEffect } from "react";
import PageWrapper from "@/components/PageWrapper";
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
  Wallet, Calendar, BarChart3, Power, Bell, MessageCircle, User, Brain, AlertTriangle,
  ShieldCheck, Car, Package, ChevronDown, ChevronUp
} from "lucide-react";
import DriverModeSelector from "../components/driver/DriverModeSelector";
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
import DriverProfileSetup from "../components/driver/DriverProfileSetup";
import { DriverPinPanel } from "../components/ride/DriverPinVerification";
import { filterNearbyRequests, DEFAULT_DRIVER_RADIUS_MILES } from "@/lib/geoUtils";

export default function DriverHub() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");
  const [isOnline, setIsOnline] = useState(false);
  const [chatRide, setChatRide] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [navRide, setNavRide] = useState(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [disputeRide, setDisputeRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [driverMode, setDriverMode] = useState("rides"); // "rides" | "delivery"
  const [showStandards, setShowStandards] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      setLoading(false);
      setIsOnline(user.driver_is_online || false);
      setDriverMode(user.driver_mode || "rides");
      
      // Check if driver profile is complete
      if (user.is_driver && (!user.driver_profile_picture || !user.driver_vehicle_type)) {
        setShowProfileSetup(true);
      }
      
      // Set initial location from user data
      if (user.driver_current_lat && user.driver_current_lng) {
        setDriverLocation([user.driver_current_lat, user.driver_current_lng]);
      }
    }).catch((error) => {
      console.log("Auth error:", error);
      setCurrentUser(null);
      setLoading(false);
    });

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

        // Only show rides whose pickup is within the driver's service radius.
        // Without a driver location we can't verify proximity, so show nothing
        // (prevents a Miami driver from seeing Tampa requests).
        if (!driverLocation) return [];
        return filterNearbyRequests(requests, driverLocation, (r) => r.pickup_coords);
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

  const handleModeChange = async (newMode) => {
    setDriverMode(newMode);
    await base44.auth.updateMe({ driver_mode: newMode });
    queryClient.invalidateQueries(['pending-ride-requests']);
    toast.success(newMode === "rides" ? "Switched to Ride Hailing mode" : "Switched to Delivery mode");
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-950 via-emerald-950 to-green-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white text-lg">Loading Driver Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper showBack={false}>
      <DriverLocationTracker isOnline={isOnline} rideId={activeRide?.id} />
      <div className="min-h-screen px-3 sm:px-6 pb-6 pt-2 bg-gradient-to-br from-green-950 via-emerald-950 to-green-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          {/* Title row */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl font-bold text-white flex items-center gap-2">
                <Activity className="w-7 h-7 sm:w-10 sm:h-10 text-green-400 flex-shrink-0" />
                Driver Hub
              </h1>
              <p className="text-gray-300 text-sm sm:text-base mt-1 hidden sm:block">
                Track your earnings • Get 88-90% of every ride • Cash out instantly
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                onClick={() => setShowAIAssistant(true)}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Brain className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">AI Assistant</span>
              </Button>
              <Button
                onClick={() => setShowProfile(true)}
                size="sm"
                variant="outline"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <User className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </div>
          </div>

          {/* Online/Offline Toggle — full width row */}
          <Card className={`mb-3 ${isOnline ? 'bg-green-600/20 border-green-500/30' : 'bg-gray-600/20 border-gray-500/30'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                  <div className="min-w-0">
                    <div className="text-white font-bold text-base leading-tight">
                      {isOnline ? "You're Online" : "You're Offline"}
                    </div>
                    <div className="text-gray-300 text-xs truncate">
                      {isOnline
                        ? `Accepting ${driverMode === "rides" ? "ride" : "delivery"} requests`
                        : "Not accepting requests"}
                    </div>
                  </div>
                  {isOnline && pendingRequests.length > 0 && (
                    <div className="flex items-center gap-1 text-yellow-400 text-sm ml-2 flex-shrink-0">
                      <Bell className="w-4 h-4 animate-pulse" />
                      <span className="font-bold">{pendingRequests.length}</span>
                      <span className="hidden xs:inline">new</span>
                    </div>
                  )}
                </div>
                <Switch
                  checked={isOnline}
                  onCheckedChange={(checked) => toggleOnlineMutation.mutate(checked)}
                  className="data-[state=checked]:bg-green-500 flex-shrink-0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Mode Selector */}
          <Card className="bg-white/5 border-white/10 mb-3">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                {driverMode === "rides"
                  ? <Car className="w-4 h-4 text-blue-400" />
                  : <Package className="w-4 h-4 text-orange-400" />
                }
                <p className="text-white text-sm font-semibold">What are you available for?</p>
              </div>
              <DriverModeSelector
                mode={driverMode}
                onChange={handleModeChange}
                disabled={isOnline}
              />
              {isOnline && (
                <p className="text-amber-400/80 text-xs mt-2 text-center">
                  Go offline to switch your mode
                </p>
              )}
            </CardContent>
          </Card>

          {/* Driver Standards Banner */}
          <button
            onClick={() => setShowStandards(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 text-left mb-1"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-300 flex-shrink-0" />
              <span className="text-white font-semibold text-sm">Driver Standards & Safety Rules</span>
            </div>
            {showStandards
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />
            }
          </button>
          <AnimatePresence>
            {showStandards && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="bg-indigo-900/20 border-indigo-500/20 mb-3">
                  <CardContent className="p-4 space-y-3">
                    {[
                      { icon: "🚗", title: "Drive Safe", rule: "Obey all traffic laws. Never use your phone while driving. Your passengers' safety is your #1 priority." },
                      { icon: "✨", title: "Keep Your Vehicle Clean", rule: "Maintain a tidy interior and exterior. No trash, strong odors, or visible damage." },
                      { icon: "🗣️", title: "Use Appropriate Language", rule: "Keep conversations professional and respectful. Profanity, harassment, or discriminatory language is strictly prohibited." },
                      { icon: "📋", title: "Valid Insurance Required", rule: "You must possess valid auto insurance at all times when active on the platform. Expired coverage = immediate deactivation." },
                      { icon: "🤝", title: "Treat Riders with Respect", rule: "Be courteous, patient, and professional. A positive experience earns better ratings and more rides." },
                      { icon: "🚫", title: "Ride Hailing: Solo Vehicle Only", rule: "When accepting ride-hail trips, you must be the only person in the vehicle. Passengers need maximum space and privacy." },
                    ].map(({ icon, title, rule }) => (
                      <div key={title} className="flex gap-3 p-3 bg-white/5 rounded-xl">
                        <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
                        <div>
                          <p className="text-white font-semibold text-sm">{title}</p>
                          <p className="text-gray-300 text-xs mt-0.5 leading-relaxed">{rule}</p>
                        </div>
                      </div>
                    ))}
                    <p className="text-indigo-300/70 text-xs text-center pt-1">
                      Violations may result in account suspension or permanent deactivation.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
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
                  <div key={ride.id} className="space-y-3">
                    <RideRequestCard
                      ride={ride}
                      onAccept={() => {
                        queryClient.invalidateQueries(['driver-active-rides']);
                        queryClient.invalidateQueries(['driver-recent-rides']);
                      }}
                      onNavigate={setNavRide}
                    />
                    {/* Show "Ride for someone else" info if applicable */}
                    {ride.is_for_someone_else && ride.recipient_name && (
                      <div className="flex items-center gap-3 px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                        <span className="text-purple-300 text-sm">
                          👤 Picking up <strong>{ride.recipient_name}</strong>
                          {ride.recipient_phone && ` · ${ride.recipient_phone}`}
                        </span>
                      </div>
                    )}
                    {/* Safety PIN — only show for en_route / arrived rides */}
                    {(ride.status === 'en_route' || ride.status === 'arrived' || ride.status === 'accepted') && (
                      <DriverPinPanel
                        ride={ride}
                        onPinConfirmed={() => {
                          queryClient.invalidateQueries(['driver-active-rides']);
                          queryClient.invalidateQueries(['driver-recent-rides']);
                        }}
                      />
                    )}
                  </div>
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
              {driverMode === "rides" ? "New Ride Requests" : "New Delivery Orders"}
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
                {driverLocation
                  ? `Waiting for ${driverMode === "rides" ? "ride" : "delivery"} requests within ${DEFAULT_DRIVER_RADIUS_MILES} miles of you...`
                  : "Enable location to receive nearby requests."}
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
          <CardContent className="p-4 sm:p-6">
            {/* Cash out row */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <div className="text-white/80 text-xs mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Available to Cash Out
                </div>
                <div className="text-4xl sm:text-5xl font-bold text-white">
                  ${(stats?.pending_payout || 0).toFixed(2)}
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Button
                  onClick={handleCashOut}
                  className="bg-white text-green-600 hover:bg-gray-100 font-bold"
                  disabled={!stats?.pending_payout || stats.pending_payout <= 0}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Instant Cash Out
                </Button>
                <Button
                  onClick={() => {
                    const lastRide = recentRides.find(r => r.status === 'completed');
                    if (lastRide) setDisputeRide(lastRide);
                    else toast.error("No completed rides to dispute");
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  File a Dispute
                </Button>
              </div>
            </div>

            {/* Stats mini-grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="text-white/70 text-xs mb-1">Today's Net</div>
                <div className="text-xl sm:text-2xl font-bold text-white">
                  ${(stats?.net_earnings || 0).toFixed(2)}
                </div>
                <div className="text-green-200 text-xs">
                  +${(stats?.tips_earned || 0).toFixed(2)} tips
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="text-white/70 text-xs mb-1">Hourly Rate</div>
                <div className="text-xl sm:text-2xl font-bold text-white">
                  ${(stats?.hourly_rate || 0).toFixed(2)}/hr
                </div>
                <div className="text-white/60 text-xs">
                  Min ${guaranteedHourly}/hr
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="text-white/70 text-xs mb-1">Streak</div>
                <div className="text-xl sm:text-2xl font-bold text-white flex items-center gap-1">
                  <Award className="w-5 h-5 text-yellow-400" />
                  {stats?.streak_count || 0}
                </div>
                <div className="text-white/60 text-xs">
                  {stats?.bonuses_earned ? `+$${stats.bonuses_earned.toFixed(2)}` : 'No bonuses'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="today" className="text-xs sm:text-sm">Today</TabsTrigger>
            <TabsTrigger value="week" className="text-xs sm:text-sm">This Week</TabsTrigger>
            <TabsTrigger value="bonuses" className="text-xs sm:text-sm">Bonuses</TabsTrigger>
          </TabsList>

          {/* Today Stats */}
          <TabsContent value="today" className="space-y-6">
            {/* Earnings Chart */}
            <EarningsChart />
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <MapPin className="w-7 h-7 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white mb-0.5">
                    {stats?.total_rides || 0}
                  </div>
                  <div className="text-gray-400 text-xs">Completed Rides</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <Activity className="w-7 h-7 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white mb-0.5">
                    {(stats?.miles_driven || 0).toFixed(1)}
                  </div>
                  <div className="text-gray-400 text-xs">Miles Driven</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <Clock className="w-7 h-7 text-orange-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white mb-0.5">
                    {(stats?.hours_online || 0).toFixed(1)}
                  </div>
                  <div className="text-gray-400 text-xs">Hours Online</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <Star className="w-7 h-7 text-yellow-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white mb-0.5">
                    {averageRating}
                  </div>
                  <div className="text-gray-400 text-xs">Rating ({myRatings.length})</div>
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

          {/* Week Stats */}
          <TabsContent value="week" className="space-y-6">
            <EarningsChart />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <MapPin className="w-7 h-7 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white mb-0.5">{weeklyStats?.total_rides || 0}</div>
                  <div className="text-gray-400 text-xs">Rides This Week</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <Activity className="w-7 h-7 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white mb-0.5">{(weeklyStats?.miles_driven || 0).toFixed(1)}</div>
                  <div className="text-gray-400 text-xs">Miles Driven</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <Clock className="w-7 h-7 text-orange-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white mb-0.5">{(weeklyStats?.hours_online || 0).toFixed(1)}</div>
                  <div className="text-gray-400 text-xs">Hours Online</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-7 h-7 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white mb-0.5">${(weeklyStats?.net_earnings || 0).toFixed(2)}</div>
                  <div className="text-gray-400 text-xs">Weekly Earnings</div>
                </CardContent>
              </Card>
            </div>
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
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
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

      {/* Driver Profile Setup */}
      {showProfileSetup && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-gray-900 rounded-3xl p-8">
            <h2 className="text-3xl font-bold text-white mb-2">Complete Your Driver Profile</h2>
            <p className="text-gray-400 mb-6">Add your photo and vehicle details to start accepting rides</p>
            <DriverProfileSetup
              currentUser={currentUser}
              onComplete={() => {
                setShowProfileSetup(false);
                queryClient.invalidateQueries();
                toast.success("Profile completed! You can now accept rides.");
              }}
            />
          </div>
        </div>
      )}
      </div>
      </PageWrapper>
      );
      }
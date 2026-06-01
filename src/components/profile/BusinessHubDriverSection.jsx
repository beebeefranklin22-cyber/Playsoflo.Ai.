import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Settings, Navigation, ChevronRight, ToggleLeft, ToggleRight, DollarSign, MapPin, Clock, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DriverProfileSetup from "../driver/DriverProfileSetup";
import DriverStatsOverview from "../driver/DriverStatsOverview";
import BecomeDriverButton from "../driver/BecomeDriverButton";
import RidePreferencesModal from "../ride/RidePreferencesModal";
import VehicleInfoModal from "../ride/VehicleInfoModal";
import StripePayoutCard from "./StripePayoutCard";
import { toast } from "sonner";

export default function BusinessHubDriverSection({ currentUser, onUserUpdate }) {
  const navigate = useNavigate();
  const [showRidePreferences, setShowRidePreferences] = useState(false);
  const [showVehicleInfo, setShowVehicleInfo] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const { data: todayStats } = useQuery({
    queryKey: ["driver-stats-today", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const rides = await base44.entities.RideRequest.filter({
        driver_email: currentUser.email,
        status: "completed"
      });
      const todayRides = rides.filter(r => new Date(r.updated_date) >= today);
      const earnings = todayRides.reduce((s, r) => s + (r.driver_earnings || 0), 0);
      const tips = todayRides.reduce((s, r) => s + (r.tip_amount || 0), 0);
      return {
        total_rides: todayRides.length,
        net_earnings: earnings,
        tips_earned: tips,
        miles_driven: todayRides.reduce((s, r) => s + (r.distance_miles || 0), 0),
        hours_online: 0,
        hourly_rate: todayRides.length > 0 ? earnings / Math.max(1, 8) : 0,
      };
    },
    enabled: !!currentUser?.is_driver,
  });

  const toggleOnline = async () => {
    if (!currentUser) return;
    setTogglingOnline(true);
    try {
      await base44.auth.updateMe({ is_driver_online: !currentUser.is_driver_online });
      toast.success(currentUser.is_driver_online ? "You're now offline" : "You're now online — accepting rides!");
      if (onUserUpdate) onUserUpdate();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setTogglingOnline(false);
    }
  };

  if (!currentUser?.is_driver) {
    return (
      <div className="space-y-4">
        <div className="text-center py-10 bg-white/5 border border-white/10 rounded-2xl">
          <Car className="w-14 h-14 text-blue-400 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Become a Driver</p>
          <p className="text-gray-400 text-sm mb-6">Earn money by giving rides in your area</p>
          <BecomeDriverButton currentUser={currentUser} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Online Toggle */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${currentUser.is_driver_online ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
            <div>
              <p className="text-white font-semibold">Driver Status</p>
              <p className="text-gray-400 text-sm">{currentUser.is_driver_online ? "Online — accepting rides" : "Offline"}</p>
            </div>
          </div>
          <Button
            onClick={toggleOnline}
            disabled={togglingOnline}
            className={currentUser.is_driver_online ? "bg-gray-600 hover:bg-gray-700" : "bg-green-600 hover:bg-green-700"}
          >
            {currentUser.is_driver_online
              ? <><ToggleRight className="w-4 h-4 mr-2" /> Go Offline</>
              : <><ToggleLeft className="w-4 h-4 mr-2" /> Go Online</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* Today's Stats */}
      <DriverStatsOverview
        stats={todayStats}
        rating={currentUser?.driver_rating || "5.0"}
        isOnline={currentUser?.is_driver_online}
      />

      {/* Driver Profile Setup */}
      <div>
        <h3 className="text-white font-bold text-base mb-3">Driver Profile & Vehicle</h3>
        <DriverProfileSetup
          currentUser={currentUser}
          onComplete={() => { if (onUserUpdate) onUserUpdate(); }}
        />
      </div>

      {/* Payments & Payouts */}
      <StripePayoutCard currentUser={currentUser} />

      {/* Ride Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Settings className="w-5 h-5" /> Ride Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => setShowRidePreferences(true)}
            variant="outline"
            className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 text-white"
          >
            <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Ride Preferences</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setShowVehicleInfo(true)}
            variant="outline"
            className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 text-white"
          >
            <span className="flex items-center gap-2"><Car className="w-4 h-4" /> Vehicle Info</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => navigate(createPageUrl("DriverHub"))}
            variant="outline"
            className="w-full justify-between bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-300"
          >
            <span className="flex items-center gap-2"><Navigation className="w-4 h-4" /> Open Full Driver Hub</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      <RidePreferencesModal
        isOpen={showRidePreferences}
        onClose={() => setShowRidePreferences(false)}
        currentUser={currentUser}
        onUpdate={() => { if (onUserUpdate) onUserUpdate(); }}
      />
      <VehicleInfoModal
        isOpen={showVehicleInfo}
        onClose={() => setShowVehicleInfo(false)}
        currentUser={currentUser}
        onUpdate={() => { if (onUserUpdate) onUserUpdate(); }}
      />
    </div>
  );
}
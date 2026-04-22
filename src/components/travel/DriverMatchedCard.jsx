import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Car, MapPin, MessageCircle, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-600"
          }`}
        />
      ))}
      <span className="ml-1.5 text-yellow-400 font-bold text-sm">{Number(rating).toFixed(1)}</span>
    </div>
  );
}

export default function DriverMatchedCard({ ride, onMessageDriver }) {
  const [driverProfile, setDriverProfile] = useState(null);
  const [driverStats, setDriverStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ride?.driver_email) return;

    const fetchDriver = async () => {
      setLoading(true);
      try {
        // Fetch driver user profile
        const users = await base44.entities.User.list();
        const profile = users.find((u) => u.email === ride.driver_email);
        setDriverProfile(profile || null);

        // Calculate rating from completed rides driven by this driver
        const completedRides = await base44.entities.RideRequest.filter({
          driver_email: ride.driver_email,
          status: "completed",
        });

        const ratedRides = completedRides.filter((r) => r.driver_rating > 0);
        const avgRating =
          ratedRides.length > 0
            ? ratedRides.reduce((sum, r) => sum + r.driver_rating, 0) / ratedRides.length
            : profile?.driver_rating || 5.0;

        setDriverStats({
          totalRides: completedRides.length,
          avgRating: Math.min(5, Math.max(1, avgRating)),
        });
      } catch (e) {
        console.error("Failed to load driver profile", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDriver();
  }, [ride?.driver_email]);

  const vehicle = ride?.driver_vehicle_info;
  const etaMinutes = ride?.estimated_arrival_time;

  // Compute approximate miles away from ETA (rough estimate at 25 mph city speed)
  const milesAway = etaMinutes ? ((etaMinutes / 60) * 25).toFixed(1) : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
    >
      {/* Green "Match Found" header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-3 flex items-center gap-2">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-2.5 h-2.5 rounded-full bg-white"
        />
        <span className="text-white font-bold text-sm uppercase tracking-wide">Driver Matched!</span>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/10 rounded w-32" />
              <div className="h-3 bg-white/10 rounded w-24" />
            </div>
          </div>
        ) : (
          <>
            {/* Driver identity */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl overflow-hidden border-2 border-white/20">
                  {driverProfile?.profile_picture || ride?.driver_profile_picture ? (
                    <img
                      src={driverProfile?.profile_picture || ride?.driver_profile_picture}
                      alt={ride?.driver_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{ride?.driver_name?.[0] || "D"}</span>
                  )}
                </div>
                {/* Verified badge */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-gray-900">
                  <Shield className="w-3 h-3 text-white" />
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-white font-bold text-lg leading-tight">
                  {ride?.driver_name || driverProfile?.full_name || "Your Driver"}
                </h3>
                <StarRating rating={driverStats?.avgRating || 5.0} />
                <p className="text-gray-400 text-xs mt-0.5">
                  {driverStats?.totalRides ?? 0} completed trips
                </p>
              </div>
            </div>

            {/* Vehicle info */}
            {vehicle && (
              <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 border border-white/10">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Car className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">
                    {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {vehicle.color && <span className="capitalize">{vehicle.color} · </span>}
                    {vehicle.license_plate && <span>{vehicle.license_plate}</span>}
                  </p>
                </div>
                {ride?.vehicle_class_details?.name && (
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs shrink-0">
                    {ride.vehicle_class_details.name}
                  </Badge>
                )}
              </div>
            )}

            {/* ETA / distance row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                <Clock className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <p className="text-white font-bold text-lg">
                  {etaMinutes ? `${etaMinutes} min` : "—"}
                </p>
                <p className="text-gray-400 text-xs">ETA to pickup</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                <MapPin className="w-4 h-4 text-green-400 mx-auto mb-1" />
                <p className="text-white font-bold text-lg">
                  {milesAway ? `${milesAway} mi` : "—"}
                </p>
                <p className="text-gray-400 text-xs">Away from you</p>
              </div>
            </div>

            {/* Message button */}
            {onMessageDriver && (
              <Button
                onClick={onMessageDriver}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Driver
              </Button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Car, Clock, MapPin, User, Phone, MessageCircle, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function RideWaitScreen({ rideRequest, onOpenTracking }) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentStatus, setCurrentStatus] = useState(rideRequest.status);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = base44.entities.RideRequest.subscribe((event) => {
      if (event.data?.id === rideRequest.id && event.type === 'update') {
        setCurrentStatus(event.data.status);
        if (event.data.status === 'accepted') {
          toast.success("Driver accepted your ride!");
        }
      }
    });
    return unsubscribe;
  }, [rideRequest.id]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const statusMessages = {
    requested: "Finding you a driver...",
    accepted: "Driver is on the way!",
    en_route: "Driver is heading to pickup",
    arrived: "Driver has arrived!"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 p-6 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        {/* Status Animation */}
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Car className="w-16 h-16 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {statusMessages[currentStatus]}
          </h2>
          <p className="text-gray-400">Please wait while we connect you with a driver</p>
        </div>

        {/* Wait Time */}
        <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-xl border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold">Wait Time</span>
            </div>
            <span className="text-2xl font-bold text-white">{formatTime(timeElapsed)}</span>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4 text-green-400" />
              <span className="flex-1 truncate">{rideRequest.pickup_address}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Navigation className="w-4 h-4 text-red-400" />
              <span className="flex-1 truncate">{rideRequest.dropoff_address}</span>
            </div>
          </div>
        </div>

        {/* Driver Info (shown when accepted) */}
        {currentStatus === 'accepted' && rideRequest.driver_name && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 rounded-2xl p-6 backdrop-blur-xl border border-white/20"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {rideRequest.driver_name?.[0]}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg">{rideRequest.driver_name}</h3>
                <p className="text-gray-400 text-sm">Your driver</p>
              </div>
            </div>

            {rideRequest.driver_vehicle_info && (
              <div className="bg-white/5 rounded-lg p-3 mb-4">
                <p className="text-white font-semibold">
                  {rideRequest.driver_vehicle_info.color} {rideRequest.driver_vehicle_info.make} {rideRequest.driver_vehicle_info.model}
                </p>
                <p className="text-gray-400 text-sm">{rideRequest.driver_vehicle_info.license_plate}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Phone className="w-4 h-4 mr-2" />
                Call
              </Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
            </div>
          </motion.div>
        )}

        {/* View on Map Button */}
        <Button
          onClick={onOpenTracking}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-6 text-lg font-bold"
        >
          View Live Tracking
        </Button>

        {/* Cancel Ride */}
        <Button
          variant="outline"
          className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
          onClick={async () => {
            await base44.entities.RideRequest.update(rideRequest.id, { status: 'cancelled' });
            toast.success("Ride cancelled");
            window.location.reload();
          }}
        >
          Cancel Ride
        </Button>
      </div>
    </div>
  );
}
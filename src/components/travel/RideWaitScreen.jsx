import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Car, Clock, MapPin, Navigation, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import CancelRideModal from "./CancelRideModal";
import RideChatModal from "../chat/RideChatModal";
import DriverMatchedCard from "./DriverMatchedCard";
import { PassengerPinDisplay } from "@/components/ride/DriverPinVerification";

export default function RideWaitScreen({ rideRequest, onOpenTracking }) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentStatus, setCurrentStatus] = useState(rideRequest.status);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [ride, setRide] = useState(rideRequest);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

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
        setRide(event.data);
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

        {/* Driver Profile Card (shown when matched) */}
        {(currentStatus === 'accepted' || currentStatus === 'en_route' || currentStatus === 'arrived') && (
          <DriverMatchedCard
            ride={ride}
            onMessageDriver={ride.driver_email ? () => setShowChat(true) : null}
          />
        )}

        {/* "Ride for someone else" banner */}
        {ride.is_for_someone_else && ride.recipient_name && (
          <div className="flex items-center gap-3 px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
            <Users className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold">Ride for {ride.recipient_name}</p>
              {ride.recipient_phone && <p className="text-purple-300 text-xs">{ride.recipient_phone}</p>}
            </div>
          </div>
        )}

        {/* Safety PIN — shown once driver is on the way */}
        {(currentStatus === 'accepted' || currentStatus === 'en_route' || currentStatus === 'arrived') && (
          <PassengerPinDisplay ride={ride} />
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
          className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 py-4"
          onClick={() => setShowCancelModal(true)}
        >
          <X className="w-5 h-5 mr-2" />
          Cancel Ride
        </Button>
      </div>

      {showCancelModal && (
        <CancelRideModal
          open={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          ride={ride}
          currentUser={currentUser}
        />
      )}

      {showChat && ride.driver_email && (
        <RideChatModal
          open={showChat}
          onClose={() => setShowChat(false)}
          ride={ride}
        />
      )}
    </div>
  );
}
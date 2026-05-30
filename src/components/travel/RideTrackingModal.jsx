import React, { useState, useEffect } from "react";
import { X, MapPin, Clock, Star, Phone, MessageCircle, Navigation, User, Car, CheckCircle, Loader2, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import DriverTippingModal from "../ride/DriverTippingModal";
import PassengerRatingModal from "../ride/PassengerRatingModal";

export default function RideTrackingModal({ rideRequest, onClose, currentUser }) {
  const navigate = useNavigate();
  const [showRating, setShowRating] = useState(false);
  const [showTipping, setShowTipping] = useState(false);

  const { data: driver } = useQuery({
    queryKey: ['driver-info', rideRequest?.driver_email],
    queryFn: async () => {
      if (!rideRequest?.driver_email) return null;
      const users = await base44.entities.User.list();
      return users.find(u => u.email === rideRequest.driver_email);
    },
    enabled: !!rideRequest?.driver_email
  });

  const { data: updatedRide } = useQuery({
    queryKey: ['ride-tracking', rideRequest?.id],
    queryFn: async () => {
      const rides = await base44.entities.RideRequest.filter({ id: rideRequest.id });
      return rides[0];
    },
    enabled: !!rideRequest,
    refetchInterval: 2000 // Poll every 2 seconds for real-time tracking
  });

  const ride = updatedRide || rideRequest;

  useEffect(() => {
    if (ride?.status === 'completed' && !showRating && !showTipping) {
      setShowRating(true);
    }
  }, [ride?.status]);

  const statusConfig = {
    requested: { label: "Finding Driver", color: "bg-yellow-500", icon: Loader2, spin: true },
    accepted: { label: "Driver Assigned", color: "bg-blue-500", icon: User },
    en_route: { label: "Driver En Route", color: "bg-purple-500", icon: Navigation },
    arrived: { label: "Driver Arrived", color: "bg-green-500", icon: MapPin },
    in_progress: { label: "Ride in Progress", color: "bg-emerald-500", icon: Car },
    completed: { label: "Completed", color: "bg-gray-500", icon: CheckCircle }
  };

  const currentStatus = statusConfig[ride?.status] || statusConfig.requested;
  const StatusIcon = currentStatus.icon;

  // Calculate wait time
  const [liveWaitTime, setLiveWaitTime] = useState(0);
  
  useEffect(() => {
    if (ride?.status === 'requested' && ride?.created_date) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((new Date() - new Date(ride.created_date)) / 1000);
        setLiveWaitTime(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    } else if (ride?.wait_time_seconds) {
      setLiveWaitTime(ride.wait_time_seconds);
    }
  }, [ride?.status, ride?.created_date, ride?.wait_time_seconds]);

  const waitTimeDisplay = {
    seconds: liveWaitTime % 60,
    minutes: Math.floor(liveWaitTime / 60)
  };

  if (showRating) {
    return (
      <PassengerRatingModal
        ride={ride}
        onClose={() => {
          setShowRating(false);
          setShowTipping(true);
        }}
      />
    );
  }

  if (showTipping) {
    return (
      <DriverTippingModal
        ride={ride}
        driver={driver}
        onClose={onClose}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-gray-900 rounded-3xl overflow-hidden max-h-[95vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/30 to-blue-900/30">
          <div>
            <h2 className="text-2xl font-bold text-white">Track Your Ride</h2>
            <p className="text-gray-400 text-sm">Real-time tracking and updates</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${currentStatus.color} rounded-full flex items-center justify-center ${currentStatus.spin ? 'animate-spin' : ''}`}>
                <StatusIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-xl">{currentStatus.label}</p>
                {ride?.status === 'requested' && (
                  <p className="text-gray-400 text-sm">
                    Searching for nearby drivers... ({waitTimeDisplay.minutes}:{String(waitTimeDisplay.seconds).padStart(2, '0')})
                  </p>
                )}
                {ride?.estimated_arrival_time && ride.status !== 'completed' && ride.status !== 'requested' && (
                  <motion.p
                    className="text-blue-400 text-sm font-semibold flex items-center gap-1"
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Clock className="w-4 h-4" />
                    ETA: {ride.estimated_arrival_time} min
                  </motion.p>
                )}
              </div>
            </div>
            {ride?.fare_breakdown?.total_fare && (
              <div className="text-right">
                <p className="text-gray-400 text-sm">Estimated Fare</p>
                <p className="text-white text-2xl font-bold">
                  ${ride.fare_breakdown.total_fare.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Map View - Real-time driver tracking */}
        {ride?.pickup_coords && (ride?.status !== 'requested' || ride?.driver_location) && (
          <div className="h-96 relative">
            <MapContainer
              key={`${ride.driver_location?.latitude}-${ride.driver_location?.longitude}-${ride.id}`}
              center={ride.driver_location ? 
                [ride.driver_location.latitude, ride.driver_location.longitude] : 
                [ride.pickup_coords[0], ride.pickup_coords[1]]
              }
              zoom={14}
              className="h-full w-full"
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              
              {/* Pickup Location */}
              <Marker position={[ride.pickup_coords[0], ride.pickup_coords[1]]}>
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-green-600">📍 Pickup</p>
                    <p className="text-xs">{ride.pickup_address}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Dropoff Location */}
              {ride.dropoff_coords && (
                <Marker position={[ride.dropoff_coords[0], ride.dropoff_coords[1]]}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-bold text-red-600">🎯 Destination</p>
                      <p className="text-xs">{ride.dropoff_address}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Driver Location - Real-time tracking */}
              {ride.driver_location && (
                <Marker position={[ride.driver_location.latitude, ride.driver_location.longitude]}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-bold text-blue-600">🚗 Your Driver</p>
                      <p className="text-xs">{driver?.full_name || 'Driver'}</p>
                      {ride.driver_location.last_updated && (
                        <p className="text-[10px] text-gray-500 mt-1">
                          Updated: {new Date(ride.driver_location.last_updated).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Real road route from pickup to dropoff */}
              {ride.route_geometry && ride.route_geometry.length > 1 && (
                <Polyline
                  positions={ride.route_geometry}
                  color="#8B5CF6"
                  weight={5}
                  opacity={0.85}
                />
              )}

              {/* Live driver-to-pickup connector */}
              {ride.driver_location && (
                <Polyline
                  positions={[
                    [ride.driver_location.latitude, ride.driver_location.longitude],
                    [ride.pickup_coords[0], ride.pickup_coords[1]]
                  ]}
                  color="#22D3EE"
                  weight={4}
                  opacity={0.7}
                  dashArray="8, 10"
                />
              )}

              {/* Fallback straight route if real geometry not available */}
              {(!ride.route_geometry || ride.route_geometry.length < 2) && ride.dropoff_coords && (
                <Polyline
                  positions={[
                    [ride.pickup_coords[0], ride.pickup_coords[1]],
                    [ride.dropoff_coords[0], ride.dropoff_coords[1]]
                  ]}
                  color="#8B5CF6"
                  weight={4}
                  opacity={0.6}
                  dashArray="10, 10"
                />
              )}
            </MapContainer>
            
            {/* Real-time tracking indicator */}
            <div className="absolute top-4 right-4 bg-green-500 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg z-[1000]">
              <motion.div
                className="w-2 h-2 bg-white rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-white text-xs font-bold">LIVE</span>
            </div>
          </div>
        )}

        {/* Driver Info */}
        {driver && ride?.status !== 'requested' && (
          <div className="p-6 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl border-2 border-white/20">
                {ride.driver_profile_picture || driver.driver_profile_picture ? (
                  <img src={ride.driver_profile_picture || driver.driver_profile_picture} className="w-full h-full object-cover" alt={driver.full_name} />
                ) : driver.profile_picture ? (
                  <img src={driver.profile_picture} className="w-full h-full object-cover" alt={driver.full_name} />
                ) : (
                  driver.full_name?.[0] || "D"
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-xl">{driver.full_name}</h3>
                  {currentUser?.favorite_drivers?.includes(driver.email) && (
                    <Heart className="w-5 h-5 fill-pink-500 text-pink-500" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">{driver.driver_rating || 5.0}</span>
                  </div>
                  <span className="text-gray-400 text-sm">• {driver.total_rides || 0} rides</span>
                </div>
                {(ride.driver_vehicle_info || driver.driver_vehicle_info) && (
                  <p className="text-gray-400 text-sm mt-1">
                    {(ride.driver_vehicle_info || driver.driver_vehicle_info).color} {(ride.driver_vehicle_info || driver.driver_vehicle_info).make} {(ride.driver_vehicle_info || driver.driver_vehicle_info).model} • {(ride.driver_vehicle_info || driver.driver_vehicle_info).license_plate}
                  </p>
                )}
                {ride.vehicle_class_details && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                      {ride.vehicle_class_details.name}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={() => navigate(createPageUrl("Messages") + `?user=${driver.email}`)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
                {driver.phone_number && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`tel:${driver.phone_number}`)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ride Details */}
        <div className="p-6 space-y-4">
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <MapPin className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-gray-400 text-xs mb-1">Pickup</p>
                <p className="text-white font-semibold">{ride?.pickup_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-gray-400 text-xs mb-1">Destination</p>
                <p className="text-white font-semibold">{ride?.dropoff_address}</p>
              </div>
            </div>
          </div>

          {ride?.estimated_distance_miles && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-xs mb-1">Distance</p>
                <p className="text-white font-bold text-xl">{ride.estimated_distance_miles.toFixed(1)} mi</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-xs mb-1">Duration</p>
                <p className="text-white font-bold text-xl">{ride.estimated_duration_minutes} min</p>
              </div>
            </div>
          )}

          {ride?.status === 'requested' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <p className="text-blue-300 font-semibold">Matching you with a driver...</p>
              </div>
              <p className="text-blue-200 text-sm">
                Average wait time: 30-90 seconds • Current wait: {waitTimeDisplay.minutes}:{String(waitTimeDisplay.seconds).padStart(2, '0')}
              </p>
              <div className="mt-3 w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-400 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((liveWaitTime / 90) * 100, 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {ride?.status === 'arrived' && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-green-300 font-semibold">Your driver has arrived!</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Close
          </Button>
          {ride?.status === 'requested' && (
            <Button
              onClick={async () => {
                await base44.entities.RideRequest.update(ride.id, { status: 'cancelled' });
                toast.success('Ride cancelled');
                onClose();
              }}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Cancel Ride
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
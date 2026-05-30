import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Clock, Users, ArrowRight, X, CheckCircle, Navigation, Volume2, Wind, Droplets, Music, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import RatingModal from "../ride/RatingModal";
import CancellationModal from "../ride/CancellationModal";
import PassengerVerificationModal from "../ride/PassengerVerificationModal";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function RideRequestCard({ ride, onAccept, onDecline, onNavigate }) {
  const [loading, setLoading] = React.useState(false);
  const [showRating, setShowRating] = React.useState(false);
  const [showMap, setShowMap] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [showPreferences, setShowPreferences] = React.useState(false);
  const [showVerification, setShowVerification] = React.useState(false);

  // Fetch customer preferences
  const { data: customerData } = useQuery({
    queryKey: ['customer-preferences', ride.created_by],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.find(u => u.email === ride.created_by);
    },
    enabled: !!ride.created_by
  });

  const handleAccept = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      const driverName = currentUser.full_name || "Your driver";
      const vehicleInfo = currentUser.driver_vehicle_info 
        ? `${currentUser.driver_vehicle_info.color} ${currentUser.driver_vehicle_info.make} ${currentUser.driver_vehicle_info.model}`
        : "your vehicle";
      
      await base44.entities.RideRequest.update(ride.id, {
        driver_status: "accepted",
        status: "en_route",
        driver_email: currentUser.email,
        driver_name: currentUser.full_name,
        driver_profile_picture: currentUser.driver_profile_picture || currentUser.profile_picture,
        driver_vehicle_info: currentUser.driver_vehicle_info,
        matched_at: new Date().toISOString()
      });
      
      // Notify customer - Driver Assigned
      await base44.entities.Notification.create({
        recipient_email: ride.created_by,
        type: "ride_update",
        title: "🚗 Driver Assigned!",
        message: `${driverName} is your driver! Look for ${vehicleInfo}. They're on their way to ${ride.pickup_address}. ETA: ${ride.estimated_duration_minutes || 5} min.`,
        reference_type: "ride",
        reference_id: ride.id,
        read: false
      });
      
      toast.success('Ride accepted! Passenger notified');
      onAccept?.();
    } catch (err) {
      console.error("Accept failed:", err);
      toast.error("Failed to accept ride");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus, title, message) => {
    setLoading(true);
    try {
      await base44.entities.RideRequest.update(ride.id, {
        status: newStatus
      });
      
      // Notify customer
      await base44.entities.Notification.create({
        recipient_email: ride.created_by,
        type: "ride_update",
        title,
        message,
        reference_type: "ride",
        reference_id: ride.id
      });
      
      onAccept?.();
    } catch (err) {
      console.error("Status update failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await base44.entities.RideRequest.update(ride.id, {
        driver_status: "declined"
      });
      onDecline?.();
    } catch (err) {
      console.error("Decline failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const estimatedEarnings = ((ride.fare_breakdown?.total_fare || 15) * 0.9).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-white/5 border-white/10 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-purple-500/20 text-purple-300">
                  {ride.ride_type}
                </Badge>
                {ride.is_shared && (
                  <Badge className="bg-blue-500/20 text-blue-300">
                    <Users className="w-3 h-3 mr-1" />
                    Shared {ride.current_passengers?.length || 1}/{ride.max_passengers}
                  </Badge>
                )}
                {ride.first_ride_free_applied && (
                  <Badge className="bg-green-500/20 text-green-300">
                    New Customer
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-white font-medium">{ride.pickup_address}</div>
                    <div className="text-gray-400 text-sm">Pickup</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-7">
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                  <div className="text-gray-400 text-sm">
                    {ride.estimated_duration_minutes || '~10'} min • {ride.estimated_distance_miles || '~5'} mi
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-white font-medium">{ride.dropoff_address}</div>
                    <div className="text-gray-400 text-sm">Dropoff</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-right ml-4">
              <div className="text-green-400 text-2xl font-bold mb-1">
                ${(ride.fare_breakdown?.driver_earnings || estimatedEarnings)}
              </div>
              <div className="text-gray-400 text-xs">You earn (88%)</div>
              {ride.vehicle_class_details && (
                <Badge className="bg-purple-500/20 text-purple-300 text-xs mt-2">
                  {ride.vehicle_class_details.name}
                </Badge>
              )}
              <div className="text-gray-500 text-xs mt-1">
                <Clock className="w-3 h-3 inline mr-1" />
                {new Date(ride.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
          
          {ride.notes && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
              <p className="text-blue-300 text-sm">{ride.notes}</p>
            </div>
          )}

          {/* Customer Preferences & Rating */}
          {customerData && (
            <div className="mb-4 space-y-3">
              {customerData.driver_rating && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-yellow-400 font-bold">⭐ {customerData.driver_rating.toFixed(1)}</span>
                  <span className="text-gray-400">({customerData.driver_total_ratings || 0} ratings)</span>
                </div>
              )}
              
              {customerData.ride_preferences && (
                <>
                  <button
                    onClick={() => setShowPreferences(!showPreferences)}
                    className="text-purple-400 text-sm font-medium hover:text-purple-300"
                  >
                    {showPreferences ? "Hide" : "View"} Customer Preferences
                  </button>
                  
                  {showPreferences && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 space-y-2">
                      {customerData.ride_preferences.quiet_ride && (
                        <div className="flex items-center gap-2 text-sm text-purple-300">
                          <Volume2 className="w-4 h-4" />
                          <span>Prefers quiet ride</span>
                        </div>
                      )}
                      {customerData.ride_preferences.ac_preference !== "medium" && (
                        <div className="flex items-center gap-2 text-sm text-blue-300">
                          <Wind className="w-4 h-4" />
                          <span>AC: {customerData.ride_preferences.ac_preference}</span>
                        </div>
                      )}
                      {customerData.ride_preferences.no_perfume && (
                        <div className="flex items-center gap-2 text-sm text-pink-300">
                          <Droplets className="w-4 h-4" />
                          <span>Sensitive to strong scents</span>
                        </div>
                      )}
                      {customerData.ride_preferences.music_genre !== "none" && (
                        <div className="flex items-center gap-2 text-sm text-green-300">
                          <Music className="w-4 h-4" />
                          <span>Music: {customerData.ride_preferences.music_genre}</span>
                        </div>
                      )}
                      {customerData.ride_preferences.conversation && (
                        <div className="flex items-center gap-2 text-sm text-cyan-300">
                          <MessageCircle className="w-4 h-4" />
                          <span>Conversation: {customerData.ride_preferences.conversation}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Mini Map Preview */}
          {showMap && ride.pickup_coords && (
            <div className="mb-4 h-48 rounded-xl overflow-hidden">
              <MapContainer
                center={
                  Array.isArray(ride.pickup_coords) && ride.pickup_coords.length === 2
                    ? ride.pickup_coords
                    : ride.pickup_coords?.lat && ride.pickup_coords?.lng
                    ? [ride.pickup_coords.lat, ride.pickup_coords.lng]
                    : [25.7617, -80.1918]
                }
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {ride.pickup_coords && (
                  <Marker position={
                    Array.isArray(ride.pickup_coords) && ride.pickup_coords.length === 2
                      ? ride.pickup_coords
                      : ride.pickup_coords?.lat && ride.pickup_coords?.lng
                      ? [ride.pickup_coords.lat, ride.pickup_coords.lng]
                      : [25.7617, -80.1918]
                  } />
                )}
              </MapContainer>
            </div>
          )}

          <div className="flex gap-2 mb-3">
            <Button
              onClick={() => setShowMap(!showMap)}
              variant="outline"
              size="sm"
              className="flex-1 bg-blue-500/10 border-blue-500/30 text-blue-300"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {showMap ? "Hide" : "Show"} Map
            </Button>
            {onNavigate && (
              <Button
                onClick={() => onNavigate(ride)}
                variant="outline"
                size="sm"
                className="flex-1 bg-purple-500/10 border-purple-500/30 text-purple-300"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Navigate
              </Button>
            )}
          </div>

          {ride.status === 'requested' ? (
            <div className="space-y-2">
              <Button
                onClick={handleAccept}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-6 font-bold"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {loading ? "Accepting..." : "Accept Ride"}
              </Button>
              <Button
                onClick={handleDecline}
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
              >
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
            </div>
          ) : ride.status === 'en_route' ? (
            <div className="space-y-2">
              <Button
                onClick={() => onNavigate ? onNavigate(ride) : window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ride.pickup_address)}`, '_blank')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Navigate to Pickup
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={async () => {
                    await base44.entities.Notification.create({
                      recipient_email: ride.created_by,
                      type: "ride_update",
                      title: "🚗 Driver Arriving Soon",
                      message: `Your driver is 2-3 minutes away from ${ride.pickup_address}. Please get ready! Look for ${customerData?.driver_vehicle_info?.color || 'your'} ${ride.ride_type}.`,
                      reference_type: "ride",
                      reference_id: ride.id,
                      read: false
                    });
                    toast.success('Passenger notified: Arriving soon');
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                >
                  🚗 Arriving Soon
                </Button>
                <Button
                  onClick={async () => {
                    await base44.entities.RideRequest.update(ride.id, { status: 'arrived' });
                    await base44.entities.Notification.create({
                      recipient_email: ride.created_by,
                      type: "ride_update",
                      title: "📍 Driver at Pickup Location",
                      message: `Your driver has arrived at ${ride.pickup_address}. Please come out now. Contact driver if you need help finding them.`,
                      reference_type: "ride",
                      reference_id: ride.id,
                      read: false
                    });
                    toast.success('Passenger notified: Arrived at pickup');
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-green-500/10 border-green-500/30 text-green-300"
                >
                  📍 At Pickup
                </Button>
              </div>
              <Button
                onClick={async () => {
                  await base44.entities.RideRequest.update(ride.id, { status: 'arrived' });
                  await base44.entities.Notification.create({
                    recipient_email: ride.created_by,
                    type: "ride_update",
                    title: "📍 Driver Has Arrived!",
                    message: `Your driver is waiting for you at ${ride.pickup_address}. Please come out to your vehicle. Look for ${customerData?.driver_vehicle_info?.color || 'the'} ${customerData?.driver_vehicle_info?.make || 'vehicle'}.`,
                    reference_type: "ride",
                    reference_id: ride.id,
                    read: false
                  });
                  toast.success('Passenger notified: You have arrived');
                  setShowVerification(true);
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                I've Arrived - Verify Passenger
              </Button>
            </div>
          ) : ride.status === 'accepted' ? (
            <div className="space-y-2">
              <Button
                onClick={() => onNavigate ? onNavigate(ride) : window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ride.dropoff_address)}`, '_blank')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Navigate to Dropoff
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={async () => {
                    await base44.entities.Notification.create({
                      recipient_email: ride.created_by,
                      type: "ride_update",
                      title: "📍 Almost at Destination",
                      message: `You're almost at ${ride.dropoff_address}. Arriving in approximately 2-3 minutes. Please prepare for dropoff.`,
                      reference_type: "ride",
                      reference_id: ride.id
                    });
                    toast.success('Passenger notified: Almost there');
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-purple-500/10 border-purple-500/30 text-purple-300"
                >
                  📍 Almost There
                </Button>
                <Button
                  onClick={async () => {
                    await base44.entities.Notification.create({
                      recipient_email: ride.created_by,
                      type: "ride_update",
                      title: "⏱️ Ride Delayed - Traffic",
                      message: `Your driver is experiencing heavy traffic. Your ride will be delayed by approximately 5-7 minutes. Current location updated on map. Thank you for your patience!`,
                      reference_type: "ride",
                      reference_id: ride.id,
                      read: false
                    });
                    toast.success('Passenger notified: Traffic delay');
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
                >
                  ⏱️ Traffic Delay
                </Button>
              </div>
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const completedTime = new Date().toISOString();
                    await base44.entities.RideRequest.update(ride.id, {
                      status: 'completed',
                      end_time: completedTime
                    });
                    
                    // Notify customer - Ride Completed
                    await base44.entities.Notification.create({
                      recipient_email: ride.created_by,
                      type: "ride_update",
                      title: "✅ Ride Completed!",
                      message: `You've arrived at ${ride.dropoff_address}. Total fare: $${ride.fare_breakdown?.total_fare?.toFixed(2) || '0.00'}. How was your ride? Please rate your driver!`,
                      reference_type: "ride",
                      reference_id: ride.id,
                      read: false
                    });
                    
                    toast.success('Ride completed! Passenger notified');
                    onAccept?.();
                  } catch (err) {
                    toast.error('Failed to complete ride');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {loading ? "Completing..." : "Complete Ride"}
              </Button>
              <Button
                onClick={() => setShowCancelModal(true)}
                disabled={loading}
                variant="outline"
                className="w-full bg-red-500/10 border-red-500/30 text-red-300"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Ride
              </Button>
            </div>
          ) : null}

          {/* Cancellation Modal */}
          {showCancelModal && (
            <CancellationModal
              open={showCancelModal}
              onClose={(cancelled) => {
                setShowCancelModal(false);
                if (cancelled) onAccept?.();
              }}
              ride={ride}
              userType="driver"
            />
          )}

          {/* Passenger Verification Modal */}
          {showVerification && (
            <PassengerVerificationModal
              open={showVerification}
              onClose={() => setShowVerification(false)}
              ride={ride}
              onVerified={() => handleStatusUpdate('accepted', 'Driver Arrived', 'Your driver has arrived and verified your identity')}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
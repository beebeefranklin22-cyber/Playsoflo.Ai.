import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Users, ArrowRight, X, CheckCircle, Navigation } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import CancellationModal from "../ride/CancellationModal";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function RideRequestCard({ ride, onAccept, onDecline, onNavigate }) {
  const [loading, setLoading] = React.useState(false);
  const [showRating, setShowRating] = React.useState(false);
  const [showMap, setShowMap] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      await base44.entities.RideRequest.update(ride.id, {
        driver_status: "accepted",
        status: "en_route",
        driver_email: currentUser.email
      });
      
      // Notify customer
      await base44.entities.Notification.create({
        recipient_email: ride.created_by,
        type: "ride_update",
        title: "Driver En Route",
        message: `Your driver is on the way to pick you up!`,
        reference_type: "ride",
        reference_id: ride.id
      });
      
      onAccept?.();
    } catch (err) {
      console.error("Accept failed:", err);
      alert("Failed to accept ride");
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
              <div className="text-green-400 text-3xl font-bold mb-1">
                ${estimatedEarnings}
              </div>
              <div className="text-gray-400 text-xs">You earn (90%)</div>
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

          {/* Mini Map Preview */}
          {showMap && ride.pickup_coords && (
            <div className="mb-4 h-48 rounded-xl overflow-hidden">
              <MapContainer
                center={ride.pickup_coords}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={ride.pickup_coords} />
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
            <div className="flex gap-3">
              <Button
                onClick={handleDecline}
                disabled={loading}
                variant="outline"
                className="flex-1 bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
              >
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <Button
                onClick={handleAccept}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {loading ? "Accepting..." : "Accept Ride"}
              </Button>
            </div>
          ) : ride.status === 'en_route' ? (
            <Button
              onClick={() => handleStatusUpdate('accepted', 'Driver Arrived', 'Your driver has arrived at the pickup location')}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Updating..." : "I've Arrived"}
            </Button>
          ) : ride.status === 'accepted' ? (
            <div className="space-y-2">
              <Button
                onClick={() => handleStatusUpdate('completed', 'Ride Completed', 'Your ride has been completed. Rate your experience!')}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {loading ? "Updating..." : "Complete Ride"}
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
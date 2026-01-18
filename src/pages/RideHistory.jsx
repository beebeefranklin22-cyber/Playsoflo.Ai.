import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, Calendar, DollarSign, Star, User, ChevronRight, 
  Download, Share2, RotateCcw, Filter, X, Map, Clock,
  Car, Navigation, CheckCircle, XCircle, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

export default function RideHistory() {
  const navigate = useNavigate();
  const [selectedRide, setSelectedRide] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.log("User not authenticated");
      }
    };
    fetchUser();
  }, []);

  const { data: rides = [], isLoading } = useQuery({
    queryKey: ['ride-history', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const allRides = await base44.entities.RideRequest.filter({
        created_by: currentUser.email
      });
      return allRides.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!currentUser
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.is_driver);
    }
  });

  const filteredRides = rides.filter(ride => 
    filterStatus === "all" || ride.status === filterStatus
  );

  const statusConfig = {
    completed: { label: "Completed", color: "bg-green-500", icon: CheckCircle },
    cancelled: { label: "Cancelled", color: "bg-red-500", icon: XCircle },
    in_progress: { label: "In Progress", color: "bg-blue-500", icon: Car },
    requested: { label: "Pending", color: "bg-yellow-500", icon: Clock }
  };

  const handleRebook = async (ride) => {
    try {
      const newRide = await base44.entities.RideRequest.create({
        pickup_address: ride.pickup_address,
        dropoff_address: ride.dropoff_address,
        pickup_coords: ride.pickup_coords,
        dropoff_coords: ride.dropoff_coords,
        ride_type: ride.ride_type,
        status: 'requested',
        estimated_distance_miles: ride.estimated_distance_miles,
        estimated_duration_minutes: ride.estimated_duration_minutes,
        fare_breakdown: ride.fare_breakdown
      });
      toast.success('Ride rebooked successfully!');
      navigate(createPageUrl("MyRides"));
    } catch (error) {
      toast.error('Failed to rebook ride');
    }
  };

  const handleShare = async (ride) => {
    const shareText = `My ride from ${ride.pickup_address} to ${ride.dropoff_address} - ${ride.estimated_distance_miles?.toFixed(1)} miles - $${ride.fare_breakdown?.total_fare?.toFixed(2)}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Ride',
          text: shareText
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Trip details copied to clipboard!');
    }
  };

  const handleDownloadReceipt = (ride) => {
    const receiptContent = `
RIDE RECEIPT
═══════════════════════════════════════

Date: ${new Date(ride.created_date).toLocaleDateString()}
Trip ID: ${ride.id}

ROUTE
Pickup: ${ride.pickup_address}
Dropoff: ${ride.dropoff_address}

DETAILS
Distance: ${ride.estimated_distance_miles?.toFixed(1)} miles
Duration: ${ride.estimated_duration_minutes} min
Ride Type: ${ride.ride_type}

FARE BREAKDOWN
Base Fare: $${ride.fare_breakdown?.base_fare?.toFixed(2) || '0.00'}
Distance: $${ride.fare_breakdown?.distance_fare?.toFixed(2) || '0.00'}
Time: $${ride.fare_breakdown?.time_fare?.toFixed(2) || '0.00'}
Total: $${ride.fare_breakdown?.total_fare?.toFixed(2) || '0.00'}

STATUS: ${ride.status.toUpperCase()}

Thank you for riding with SoFlo!
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ride-receipt-${ride.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Receipt downloaded!');
  };

  const getDriverInfo = (driverEmail) => {
    return drivers.find(d => d.email === driverEmail);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 flex items-center justify-center">
        <div className="text-white text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Car className="w-12 h-12 mx-auto mb-4" />
          </motion.div>
          <p>Loading your ride history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-b border-white/10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Ride History</h1>
              <p className="text-gray-400">View and manage your past trips</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { key: "all", label: "All Rides" },
              { key: "completed", label: "Completed" },
              { key: "cancelled", label: "Cancelled" },
              { key: "in_progress", label: "Active" }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setFilterStatus(filter.key)}
                className={`px-4 py-2 rounded-xl font-medium transition whitespace-nowrap ${
                  filterStatus === filter.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rides List */}
      <div className="max-w-7xl mx-auto p-6">
        {filteredRides.length === 0 ? (
          <div className="text-center py-20">
            <Car className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">No rides found</h3>
            <p className="text-gray-400 mb-6">
              {filterStatus === "all" 
                ? "Start your journey by booking your first ride!"
                : `No ${filterStatus} rides to show`}
            </p>
            <Button
              onClick={() => navigate(createPageUrl("Travel"))}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              Book a Ride
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRides.map((ride, index) => {
              const driver = getDriverInfo(ride.driver_email);
              const status = statusConfig[ride.status] || statusConfig.completed;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedRide(ride)}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${status.color} text-white`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                        <span className="text-gray-400 text-sm">
                          {new Date(ride.created_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {/* Route */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 bg-green-400 rounded-full mt-1 flex-shrink-0" />
                          <p className="text-white font-medium">{ride.pickup_address}</p>
                        </div>
                        <div className="ml-1.5 border-l-2 border-dashed border-gray-600 h-4" />
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 bg-red-400 rounded-full mt-1 flex-shrink-0" />
                          <p className="text-white font-medium">{ride.dropoff_address}</p>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">Distance</p>
                          <p className="text-white font-semibold">
                            {ride.estimated_distance_miles?.toFixed(1) || '—'} mi
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Duration</p>
                          <p className="text-white font-semibold">
                            {ride.estimated_duration_minutes || '—'} min
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Fare</p>
                          <p className="text-white font-semibold">
                            ${ride.fare_breakdown?.total_fare?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Type</p>
                          <p className="text-white font-semibold capitalize">
                            {ride.ride_type?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>

                      {/* Driver Info */}
                      {driver && (
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {driver.profile_photo ? (
                              <img src={driver.profile_photo} className="w-full h-full object-cover rounded-full" alt="" />
                            ) : (
                              driver.full_name?.[0]
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">{driver.full_name}</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-yellow-400 text-sm">{driver.driver_rating || 5.0}</span>
                            </div>
                          </div>
                          {ride.passenger_rating && (
                            <div className="text-right">
                              <p className="text-gray-400 text-xs">Your Rating</p>
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-white font-bold">{ride.passenger_rating}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <ChevronRight className="w-6 h-6 text-gray-400 ml-4 flex-shrink-0" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setSelectedRide(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-gray-900 rounded-3xl overflow-hidden max-h-[95vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Trip Details</h2>
                    <p className="text-gray-400 text-sm">
                      {new Date(selectedRide.created_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedRide(null)}
                    className="p-2 hover:bg-white/10 rounded-full transition"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Map */}
              {selectedRide.pickup_coords && selectedRide.dropoff_coords && (
                <div className="h-80 relative">
                  <MapContainer
                    center={[
                      (selectedRide.pickup_coords[0] + selectedRide.dropoff_coords[0]) / 2,
                      (selectedRide.pickup_coords[1] + selectedRide.dropoff_coords[1]) / 2
                    ]}
                    zoom={12}
                    className="h-full w-full"
                    zoomControl={true}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    
                    <Marker position={selectedRide.pickup_coords}>
                      <Popup>
                        <div className="text-center">
                          <p className="font-bold text-green-600">📍 Pickup</p>
                          <p className="text-xs">{selectedRide.pickup_address}</p>
                        </div>
                      </Popup>
                    </Marker>

                    <Marker position={selectedRide.dropoff_coords}>
                      <Popup>
                        <div className="text-center">
                          <p className="font-bold text-red-600">🎯 Dropoff</p>
                          <p className="text-xs">{selectedRide.dropoff_address}</p>
                        </div>
                      </Popup>
                    </Marker>

                    <Polyline
                      positions={[selectedRide.pickup_coords, selectedRide.dropoff_coords]}
                      color="#8B5CF6"
                      weight={4}
                      opacity={0.7}
                    />
                  </MapContainer>
                </div>
              )}

              {/* Fare Breakdown */}
              {selectedRide.fare_breakdown && (
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">Fare Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-300">
                      <span>Base Fare</span>
                      <span className="font-semibold">${selectedRide.fare_breakdown.base_fare?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Distance ({selectedRide.estimated_distance_miles?.toFixed(1)} mi)</span>
                      <span className="font-semibold">${selectedRide.fare_breakdown.distance_fare?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Time ({selectedRide.estimated_duration_minutes} min)</span>
                      <span className="font-semibold">${selectedRide.fare_breakdown.time_fare?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="pt-3 border-t border-white/20 flex justify-between text-white text-lg">
                      <span className="font-bold">Total</span>
                      <span className="font-bold">${selectedRide.fare_breakdown.total_fare?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Driver Info */}
              {getDriverInfo(selectedRide.driver_email) && (
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">Driver Information</h3>
                  {(() => {
                    const driver = getDriverInfo(selectedRide.driver_email);
                    return (
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl overflow-hidden">
                          {driver.profile_photo ? (
                            <img src={driver.profile_photo} className="w-full h-full object-cover" alt="" />
                          ) : (
                            driver.full_name?.[0]
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-bold text-xl">{driver.full_name}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-yellow-400 font-semibold">{driver.driver_rating || 5.0}</span>
                            </div>
                            <span className="text-gray-400">• {driver.total_rides || 0} rides</span>
                          </div>
                          {driver.driver_vehicle_info && (
                            <p className="text-gray-400 text-sm mt-1">
                              {driver.driver_vehicle_info.color} {driver.driver_vehicle_info.make} {driver.driver_vehicle_info.model}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Actions */}
              <div className="p-6 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={() => handleRebook(selectedRide)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Rebook
                  </Button>
                  <Button
                    onClick={() => handleShare(selectedRide)}
                    variant="outline"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    onClick={() => handleDownloadReceipt(selectedRide)}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Receipt
                  </Button>
                </div>
                <Button
                  onClick={() => setSelectedRide(null)}
                  variant="ghost"
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin, Clock, DollarSign, Users, Share2, X,
  CheckCircle, ArrowRight, Copy, Crown, Star, MessageCircle,
  Settings, Calendar, Gift, Heart
} from "lucide-react";
import { motion } from "framer-motion";
import RideTrackingMap from "../components/ride/RideTrackingMap";
import RatingModal from "../components/ride/RatingModal";
import PassengerRatingModal from "../components/ride/PassengerRatingModal";
import RideChatModal from "../components/chat/RideChatModal";
import CancellationModal from "../components/ride/CancellationModal";
import RidePreferencesModal from "../components/ride/RidePreferencesModal";
import ScheduleRideModal from "../components/ride/ScheduleRideModal";
import GiftRideModal from "../components/ride/GiftRideModal";
import TipButton from "../components/TipButton";

export default function MyRides() {
  const [currentUser, setCurrentUser] = useState(null);
  const [trackingRideId, setTrackingRideId] = useState(null);
  const [ratingRide, setRatingRide] = useState(null);
  const [passengerRatingRide, setPassengerRatingRide] = useState(null);
  const [chatRide, setChatRide] = useState(null);
  const [cancelRide, setCancelRide] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showGiftRide, setShowGiftRide] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: myRides = [] } = useQuery({
    queryKey: ['my-rides', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.RideRequest.filter({
        created_by: currentUser.email
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const declineRideMutation = useMutation({
    mutationFn: async (rideId) => {
      await base44.entities.RideRequest.update(rideId, {
        status: "declined_by_customer"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-rides']);
    }
  });

  const scheduleRideMutation = useMutation({
    mutationFn: async (rideData) => {
      const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
      return await base44.entities.RideRequest.create({
        ...rideData,
        ride_type: "car",
        status: "scheduled",
        passenger_verification_code: verificationCode,
        rider_preferences: currentUser?.ride_preferences || {},
        fare_breakdown: {
          total_fare: 15,
          base_fare: 5,
          distance_fare: 10
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-rides']);
    }
  });

  // Poll for driver location if ride is active
  const { data: driverLocation } = useQuery({
    queryKey: ['driver-location', trackingRideId],
    queryFn: async () => {
      if (!trackingRideId) return null;
      const ride = myRides.find(r => r.id === trackingRideId);
      if (!ride?.driver_email) return null;

      try {
        const drivers = await base44.entities.User.filter({
          email: ride.driver_email
        });
        const driver = drivers[0];
        if (!driver?.driver_current_lat) return null;

        return {
          lat: driver.driver_current_lat,
          lng: driver.driver_current_lng,
          lastUpdate: driver.driver_last_location_update
        };
      } catch (err) {
        console.error("Error fetching driver location:", err);
        return null;
      }
    },
    enabled: !!trackingRideId,
    refetchInterval: 10000,
    staleTime: 5000
  });

  const copyShareLink = (link) => {
    navigator.clipboard.writeText(link);
    alert("Share link copied! Send it to friends to split the cost.");
  };

  const activeRides = myRides.filter(r => 
    ['requested', 'accepted', 'en_route'].includes(r.status)
  );
  const completedRides = myRides.filter(r => r.status === 'completed');
  const cancelledRides = myRides.filter(r => 
    ['cancelled', 'declined_by_customer'].includes(r.status)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 p-6 pb-20">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">My Rides</h1>
              <p className="text-gray-300 text-lg">
                Track and manage your ride requests
              </p>
            </div>
            <Button
              onClick={() => setShowPreferences(true)}
              variant="outline"
              className="bg-white/5 border-white/20"
            >
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => setShowSchedule(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Schedule Ride
            </Button>
            <Button
              onClick={() => setShowGiftRide(true)}
              className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
            >
              <Gift className="w-5 h-5 mr-2" />
              Gift a Ride
            </Button>
          </div>
        </motion.div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="active">
              Active ({activeRides.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedRides.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({cancelledRides.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeRides.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <MapPin className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No active rides</h3>
                  <p className="text-gray-400">Request a ride to get started</p>
                </CardContent>
              </Card>
            ) : (
              activeRides.map(ride => (
                <Card key={ride.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                         <Badge className={
                           ride.status === 'accepted' ? 'bg-blue-500/20 text-blue-300 animate-pulse' :
                           ride.status === 'en_route' ? 'bg-purple-500/20 text-purple-300 animate-pulse' :
                           'bg-yellow-500/20 text-yellow-300'
                         }>
                           {ride.status === 'requested' ? '🔍 Finding driver...' :
                            ride.status === 'accepted' ? '📍 DRIVER ARRIVED' :
                            '🚗 DRIVER EN ROUTE'}
                         </Badge>
                          {ride.is_shared && (
                            <Badge className="bg-blue-500/20 text-blue-300">
                              <Users className="w-3 h-3 mr-1" />
                              Shared {ride.current_passengers?.length || 1}/{ride.max_passengers}
                            </Badge>
                          )}
                          {ride.is_group_booking && (
                            <Badge className="bg-yellow-500/20 text-yellow-300">
                              <Crown className="w-3 h-3 mr-1" />
                              {ride.vehicles_needed} Vehicles • {ride.group_booking_type?.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-5 h-5 text-green-400 mt-0.5" />
                            <div>
                              <div className="text-white font-medium">{ride.pickup_address}</div>
                              <div className="text-gray-400 text-sm">Pickup</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-7">
                            <ArrowRight className="w-4 h-4 text-gray-500" />
                            <div className="text-gray-400 text-sm">
                              {ride.estimated_duration_minutes || '~10'} min
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <MapPin className="w-5 h-5 text-red-400 mt-0.5" />
                            <div>
                              <div className="text-white font-medium">{ride.dropoff_address}</div>
                              <div className="text-gray-400 text-sm">Dropoff</div>
                            </div>
                          </div>
                        </div>

                        {ride.is_shared && ride.shareable_link && (
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-blue-300 text-sm font-medium mb-1">
                                  Share this ride to split costs
                                </div>
                                <div className="text-blue-200 text-xs">
                                  {ride.current_passengers?.length || 1} of {ride.max_passengers} seats filled
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => copyShareLink(ride.shareable_link)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                              </Button>
                            </div>
                          </div>
                        )}

                        {ride.driver_email && (
                          <div className="bg-white/5 rounded-lg p-3 mb-3">
                            <div className="text-gray-400 text-sm mb-1">Driver</div>
                            <div className="text-white font-medium">{ride.driver_email}</div>
                          </div>
                        )}
                      </div>

                      <div className="text-right ml-4">
                        <div className="text-white text-2xl font-bold mb-1">
                          ${ride.is_shared 
                            ? (ride.fare_breakdown?.per_passenger_fare || 10).toFixed(2)
                            : (ride.fare_breakdown?.total_fare || 15).toFixed(2)
                          }
                        </div>
                        {ride.is_shared && (
                          <div className="text-green-400 text-xs">
                            Saved ${(ride.fare_breakdown?.shared_discount || 0).toFixed(2)}
                          </div>
                        )}
                        <div className="text-gray-500 text-xs mt-2">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(ride.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Live Tracking Map */}
                    {trackingRideId === ride.id && driverLocation && (
                      <div className="mt-4">
                        <RideTrackingMap ride={ride} driverLocation={driverLocation} />
                      </div>
                    )}

                    {(ride.status === 'accepted' || ride.status === 'en_route') && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={() => setTrackingRideId(trackingRideId === ride.id ? null : ride.id)}
                          variant="outline"
                          className="flex-1 bg-blue-500/10 border-blue-500/30 text-blue-300"
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          {trackingRideId === ride.id ? "Hide Map" : "Track Live"}
                        </Button>
                        <Button
                          onClick={() => setChatRide(ride)}
                          variant="outline"
                          className="flex-1 bg-purple-500/10 border-purple-500/30 text-purple-300"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Chat
                        </Button>
                      </div>
                    )}

                    {['requested', 'en_route'].includes(ride.status) && (
                      <Button
                        onClick={() => setCancelRide(ride)}
                        variant="outline"
                        className="w-full bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel Ride
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedRides.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No completed rides yet</h3>
                  <p className="text-gray-400">Your ride history will appear here</p>
                </CardContent>
              </Card>
            ) : (
              completedRides.map(ride => (
                <Card key={ride.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-white font-medium mb-1">
                          {ride.pickup_address} → {ride.dropoff_address}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {new Date(ride.end_time).toLocaleDateString()} at{' '}
                          {new Date(ride.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {ride.is_shared && (
                          <Badge className="bg-blue-500/20 text-blue-300 mt-2">
                            <Users className="w-3 h-3 mr-1" />
                            Shared Ride
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-white text-xl font-bold">
                          ${(ride.fare_breakdown?.per_passenger_fare || ride.fare_breakdown?.total_fare || 0).toFixed(2)}
                        </div>
                        {ride.is_shared && ride.fare_breakdown?.shared_discount > 0 && (
                          <div className="text-green-400 text-xs">
                            Saved ${ride.fare_breakdown.shared_discount.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {!ride.passenger_rating ? (
                        <Button
                          onClick={() => setPassengerRatingRide(ride)}
                          size="sm"
                          className="flex-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30"
                        >
                          <Star className="w-4 h-4 mr-2" />
                          Rate Driver
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-4 h-4 fill-yellow-400" />
                          <span className="font-semibold">{ride.passenger_rating}</span>
                        </div>
                      )}
                      {ride.driver_email && (
                        <>
                          <TipButton
                            creatorEmail={ride.driver_email}
                            creatorName={ride.driver_email}
                            contentId={ride.id}
                            variant="outline"
                            size="sm"
                            showAmount={true}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setChatRide(ride)}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {cancelledRides.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <X className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No cancelled rides</h3>
                </CardContent>
              </Card>
            ) : (
              cancelledRides.map(ride => (
                <Card key={ride.id} className="bg-white/5 border-white/10 opacity-60">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium mb-1">
                          {ride.pickup_address} → {ride.dropoff_address}
                        </div>
                        <div className="text-gray-400 text-sm">
                          Cancelled on {new Date(ride.updated_date).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge className="bg-red-500/20 text-red-300">
                        Cancelled
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Rating Modal */}
      {ratingRide && (
        <RatingModal
          open={!!ratingRide}
          onClose={() => setRatingRide(null)}
          ride={ratingRide}
          raterType="customer"
        />
      )}

      {/* Chat Modal */}
      {chatRide && (
        <RideChatModal
          open={!!chatRide}
          onClose={() => setChatRide(null)}
          ride={chatRide}
        />
      )}

      {/* Cancellation Modal */}
      {cancelRide && (
        <CancellationModal
          open={!!cancelRide}
          onClose={(cancelled) => {
            setCancelRide(null);
            if (cancelled) queryClient.invalidateQueries(['my-rides']);
          }}
          ride={cancelRide}
          userType="passenger"
        />
      )}

      {/* Preferences Modal */}
      <RidePreferencesModal
        open={showPreferences}
        onClose={() => setShowPreferences(false)}
        currentUser={currentUser}
        onSave={() => queryClient.invalidateQueries(['my-rides'])}
      />

      {/* Schedule Ride Modal */}
      <ScheduleRideModal
        open={showSchedule}
        onClose={() => setShowSchedule(false)}
        onSchedule={(rideData) => scheduleRideMutation.mutate(rideData)}
      />

      {/* Gift Ride Modal */}
      <GiftRideModal
        open={showGiftRide}
        onClose={() => setShowGiftRide(false)}
      />

      {/* Passenger Rating Modal */}
      {passengerRatingRide && (
        <PassengerRatingModal
          ride={passengerRatingRide}
          onClose={() => {
            setPassengerRatingRide(null);
            queryClient.invalidateQueries(['my-rides']);
          }}
        />
      )}
    </div>
  );
}
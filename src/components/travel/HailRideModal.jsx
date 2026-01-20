import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Users, Share2, Clock, Crown, Calendar, CheckCircle, Loader2, X, Settings } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import RideTrackingModal from "./RideTrackingModal";
import VehicleTypeSelector, { vehicleTypes } from "./VehicleTypeSelector";
import SavedAddresses from "./SavedAddresses";
import PaymentConfirmationModal from "./PaymentConfirmationModal";
import RideWaitScreen from "./RideWaitScreen";

export default function HailRideModal({ open, onClose }) {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [estimatedDistance, setEstimatedDistance] = useState(null);
  const [estimatedDuration, setEstimatedDuration] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWaitScreen, setShowWaitScreen] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [showTracking, setShowTracking] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [riderPreferences, setRiderPreferences] = useState({
    quiet_ride: false,
    ac_preference: "medium",
    music_genre: "none"
  });

  useEffect(() => {
    if (open) {
      base44.auth.me().then(setCurrentUser).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    const autoCalculate = async () => {
      if (!pickup || !dropoff || calculating) return;
      
      setCalculating(true);
      try {
        // Auto-calculate when both addresses are filled
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // In production, use Google Maps Distance Matrix API
        const mockDistance = Math.random() * 15 + 2;
        const mockDuration = Math.random() * 30 + 5;
        
        setEstimatedDistance(mockDistance);
        setEstimatedDuration(mockDuration);
      } catch (error) {
        console.error("Calculation error:", error);
      } finally {
        setCalculating(false);
      }
    };

    autoCalculate();
  }, [pickup, dropoff]);



  const openPaymentModal = () => {
    if (!estimatedDistance || !estimatedDuration) {
      toast.error("Please wait for route calculation");
      return;
    }
    if (!selectedVehicle) {
      toast.error("Please select a vehicle type");
      return;
    }
    setShowPaymentModal(true);
  };

  const confirmPaymentAndRequestRide = async () => {
    const baseFare = selectedVehicle.basePrice;
    const distanceFare = selectedVehicle.pricePerMile * estimatedDistance;
    const timeFare = selectedVehicle.pricePerMinute * estimatedDuration;
    const totalFare = baseFare + distanceFare + timeFare;
    const driverEarnings = totalFare * 0.88;
    const platformFee = totalFare * 0.12;
    
    try {
      const ride = await base44.entities.RideRequest.create({
        pickup_address: pickup,
        dropoff_address: dropoff,
        ride_type: selectedVehicle.id,
        vehicle_class_details: {
          name: selectedVehicle.name,
          base_price: selectedVehicle.basePrice,
          price_per_mile: selectedVehicle.pricePerMile,
          price_per_minute: selectedVehicle.pricePerMinute,
          capacity: selectedVehicle.capacity,
          description: selectedVehicle.description
        },
        status: "requested",
        is_shared: selectedVehicle.id === 'shared',
        max_passengers: selectedVehicle.id === 'shared' ? 2 : 1,
        pickup_coords: [25.7617, -80.1918],
        dropoff_coords: [25.7743, -80.1937],
        estimated_distance_miles: estimatedDistance,
        estimated_duration_minutes: estimatedDuration,
        rider_preferences: riderPreferences,
        fare_breakdown: {
          base_fare: baseFare,
          distance_fare: distanceFare,
          time_fare: timeFare,
          surge_multiplier: 1.0,
          total_fare: totalFare,
          driver_earnings: driverEarnings,
          platform_fee: platformFee
        }
      });
      
      setCurrentRide(ride);
      setShowPaymentModal(false);
      setShowWaitScreen(true);
      
      // Send notification to nearby drivers
      await base44.entities.Notification.create({
        user_email: "drivers@soflolive.com", // Broadcast to drivers
        title: "New Ride Request",
        message: `${selectedVehicle.name} ride from ${pickup}`,
        type: "ride_request",
        data: { ride_id: ride.id }
      });
      
      toast.success("Ride requested! Finding you a driver...");
    } catch (error) {
      toast.error(error.message || 'Failed to request ride');
    }
  };

  return (
    <>
      {showWaitScreen && currentRide ? (
        <RideWaitScreen
          rideRequest={currentRide}
          onOpenTracking={() => {
            setShowWaitScreen(false);
            setShowTracking(true);
          }}
        />
      ) : showTracking && currentRide ? (
        <RideTrackingModal
          rideRequest={currentRide}
          onClose={() => {
            setShowTracking(false);
            setCurrentRide(null);
            onClose();
          }}
          currentUser={currentUser}
        />
      ) : (
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Book Your Ride</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Saved Addresses */}
              {currentUser && (
                <SavedAddresses
                  currentUser={currentUser}
                  onSelectAddress={(address) => {
                    if (!pickup) {
                      setPickup(address);
                    } else {
                      setDropoff(address);
                    }
                  }}
                />
              )}

              <VehicleTypeSelector
                selectedType={selectedVehicle?.id}
                onSelect={(vehicle) => setSelectedVehicle(vehicle)}
                estimatedDistance={estimatedDistance}
                estimatedDuration={estimatedDuration}
              />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <Input 
                    placeholder="Pickup address" 
                    value={pickup} 
                    onChange={(e) => setPickup(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Navigation className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <Input 
                    placeholder="Dropoff address" 
                    value={dropoff} 
                    onChange={(e) => setDropoff(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              {calculating && (
                <div className="flex items-center justify-center gap-2 text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Calculating route...</span>
                </div>
              )}
              <Button
                onClick={() => setShowPreferences(!showPreferences)}
                variant="outline"
                className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <Settings className="w-4 h-4 mr-2" />
                {showPreferences ? "Hide" : "Show"} Ride Preferences
              </Button>

              {showPreferences && (
                <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Quiet Ride</span>
                    <Switch
                      checked={riderPreferences.quiet_ride}
                      onCheckedChange={(checked) => setRiderPreferences({ ...riderPreferences, quiet_ride: checked })}
                    />
                  </div>
                  
                  <div>
                    <label className="text-white text-sm mb-2 block">AC Preference</label>
                    <Select
                      value={riderPreferences.ac_preference}
                      onValueChange={(v) => setRiderPreferences({ ...riderPreferences, ac_preference: v })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Off</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-white text-sm mb-2 block">Music</label>
                    <Select
                      value={riderPreferences.music_genre}
                      onValueChange={(v) => setRiderPreferences({ ...riderPreferences, music_genre: v })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Music</SelectItem>
                        <SelectItem value="pop">Pop</SelectItem>
                        <SelectItem value="rock">Rock</SelectItem>
                        <SelectItem value="hip-hop">Hip Hop</SelectItem>
                        <SelectItem value="jazz">Jazz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6 text-lg font-bold" 
                onClick={openPaymentModal} 
                disabled={!pickup || !dropoff || !selectedVehicle || !estimatedDistance || calculating}
              >
                {selectedVehicle && estimatedDistance
                  ? `Confirm Ride • $${((selectedVehicle.basePrice + selectedVehicle.pricePerMile * estimatedDistance + selectedVehicle.pricePerMinute * estimatedDuration).toFixed(2))}`
                  : 'Select Vehicle & Enter Addresses'}
              </Button>
        </div>
      </DialogContent>
    </Dialog>
      )}

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={confirmPaymentAndRequestRide}
        currentUser={currentUser}
        rideDetails={{
          pickup,
          dropoff,
          vehicleName: selectedVehicle?.name,
          distance: estimatedDistance?.toFixed(1),
          duration: Math.round(estimatedDuration),
          totalFare: selectedVehicle && estimatedDistance 
            ? selectedVehicle.basePrice + selectedVehicle.pricePerMile * estimatedDistance + selectedVehicle.pricePerMinute * estimatedDuration
            : 0
        }}
      />
    </>
  );
}
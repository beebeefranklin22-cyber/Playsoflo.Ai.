import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Car, Bike, Rocket, Users, Share2, Clock, Crown, Calendar, CheckCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function HailRideModal({ open, onClose }) {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [rideType, setRideType] = useState("car");
  const [isShared, setIsShared] = useState(false);
  const [waitForShared, setWaitForShared] = useState(false);
  const [maxPassengers, setMaxPassengers] = useState(2);
  const [estimatedFare, setEstimatedFare] = useState(15);
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [vehiclesNeeded, setVehiclesNeeded] = useState(2);
  const [groupBookingType, setGroupBookingType] = useState("event_pickup");
  const [assignedDriver, setAssignedDriver] = useState(null);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Poll for assigned driver after ride request
  const { data: activeRide } = useQuery({
    queryKey: ['active-ride-lookup'],
    queryFn: async () => {
      const rides = await base44.entities.RideRequest.filter({ status: 'requested' }, '-created_date', 1);
      return rides[0] || null;
    },
    enabled: requestSubmitted && !assignedDriver,
    refetchInterval: 3000
  });

  // Fetch driver info when assigned
  const { data: driverInfo } = useQuery({
    queryKey: ['driver-info', activeRide?.driver_email],
    queryFn: async () => {
      if (!activeRide?.driver_email) return null;
      const users = await base44.entities.User.list();
      return users.find(u => u.email === activeRide.driver_email);
    },
    enabled: !!activeRide?.driver_email && !assignedDriver
  });

  useEffect(() => {
    if (activeRide?.driver_status === 'accepted' && driverInfo) {
      setAssignedDriver(driverInfo);
      toast.success('Driver found!');
    }
  }, [activeRide, driverInfo]);

  const RideBtn = ({ type, Icon, label }) => (
    <button
      onClick={() => setRideType(type)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
        rideType === type ? "border-purple-500 bg-purple-500/10 text-purple-400" : "border-white/20 text-white/80"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </button>
  );

  const requestRide = async () => {
    const baseFare = isGroupBooking ? estimatedFare * vehiclesNeeded : estimatedFare;
    
    try {
      const ride = await base44.entities.RideRequest.create({
        pickup_address: pickup,
        dropoff_address: dropoff,
        ride_type: rideType,
        status: "requested",
        first_ride_free_applied: !isGroupBooking,
        is_shared: isShared && !isGroupBooking,
        wait_for_shared: waitForShared,
        max_passengers: isShared ? maxPassengers : 1,
        shareable_link: isShared && !isGroupBooking ? `${window.location.origin}/share-ride/${Math.random().toString(36).substring(7)}` : null,
        is_group_booking: isGroupBooking,
        vehicles_needed: isGroupBooking ? vehiclesNeeded : 1,
        group_booking_type: isGroupBooking ? groupBookingType : null,
        fare_breakdown: {
          total_fare: baseFare,
          shared_discount: isShared && !isGroupBooking ? estimatedFare * 0.3 : 0,
          per_passenger_fare: isShared && !isGroupBooking ? (estimatedFare * 0.7) / maxPassengers : estimatedFare
        }
      });
      
      setRequestSubmitted(true);
      toast.success('Ride requested! Finding a driver...');
      
      if (isShared && !isGroupBooking && ride.shareable_link) {
        navigator.clipboard.writeText(ride.shareable_link);
        toast.info('Share link copied to clipboard');
      }
    } catch (error) {
      toast.error('Failed to request ride');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Hail a Ride</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <RideBtn type="car" Icon={Car} label="Car" />
            <RideBtn type="motorcycle" Icon={Bike} label="Motorcycle" />
            <RideBtn type="ebike" Icon={Bike} label="e-Bike" />
            <RideBtn type="scooter" Icon={Rocket} label="Scooter" />
          </div>
          <Input placeholder="Pickup address" value={pickup} onChange={(e) => setPickup(e.target.value)} />
          <Input placeholder="Dropoff address" value={dropoff} onChange={(e) => setDropoff(e.target.value)} />
          
          {/* Group/Motorcade Booking */}
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-medium">Group Booking / Motorcade</span>
              </div>
              <Switch 
                checked={isGroupBooking} 
                onCheckedChange={(checked) => {
                  setIsGroupBooking(checked);
                  if (checked) setIsShared(false); // Can't be both
                }} 
              />
            </div>
            
            {isGroupBooking && (
              <>
                <div className="text-purple-400 text-sm">
                  Perfect for events, clubs, VIP transport, or airport groups
                </div>
                
                <div>
                  <label className="text-white text-sm mb-2 block">Number of Vehicles</label>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5, 6].map(n => (
                      <button
                        key={n}
                        onClick={() => setVehiclesNeeded(n)}
                        className={`flex-1 py-2 rounded-lg ${
                          vehiclesNeeded === n 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-white/10 text-gray-300'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-white text-sm mb-2 block">Booking Type</label>
                  <Select value={groupBookingType} onValueChange={setGroupBookingType}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motorcade">VIP Motorcade</SelectItem>
                      <SelectItem value="event_pickup">Event Pickup</SelectItem>
                      <SelectItem value="event_dropoff">Event Dropoff</SelectItem>
                      <SelectItem value="club_transport">Club Transport</SelectItem>
                      <SelectItem value="airport_group">Airport Group</SelectItem>
                      <SelectItem value="custom">Custom Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="border-t border-white/10 pt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Per vehicle:</span>
                    <span className="text-gray-400">${estimatedFare.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white font-medium">Total ({vehiclesNeeded} vehicles):</span>
                    <span className="text-yellow-400 font-bold text-lg">
                      ${(estimatedFare * vehiclesNeeded).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-300 text-xs">
                    <strong>Note:</strong> All vehicles will arrive together and follow the same route for coordinated transport.
                  </p>
                </div>
              </>
            )}
          </div>
          
          {/* Ride Sharing Options */}
          {!isGroupBooking && (
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium">Share Ride</span>
              </div>
              <Switch checked={isShared} onCheckedChange={setIsShared} />
            </div>
            
            {isShared && (
              <>
                <div className="text-green-400 text-sm">
                  Save up to 30%! Split costs with other riders.
                </div>
                
                <div>
                  <label className="text-white text-sm mb-2 block">Max Passengers (including you)</label>
                  <div className="flex gap-2">
                    {[2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => setMaxPassengers(n)}
                        className={`flex-1 py-2 rounded-lg ${
                          maxPassengers === n 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-white/10 text-gray-300'
                        }`}
                      >
                        {n} People
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span className="text-white text-sm">Wait for others to join</span>
                  </div>
                  <Switch checked={waitForShared} onCheckedChange={setWaitForShared} />
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Share2 className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-300 text-sm font-medium">Share with friends</span>
                  </div>
                  <p className="text-blue-200 text-xs">
                    We'll generate a link you can share to fill seats and split costs
                  </p>
                </div>
                
                <div className="border-t border-white/10 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Original fare:</span>
                    <span className="text-gray-400 line-through">${estimatedFare.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white font-medium">Your share:</span>
                    <span className="text-green-400 font-bold text-lg">
                      ${((estimatedFare * 0.7) / maxPassengers).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          )}
          
          {/* Driver Info */}
          {assignedDriver && assignedDriver.driver_vehicle_info && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-300 font-semibold">Driver Assigned!</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold overflow-hidden">
                  {assignedDriver.profile_photo ? (
                    <img src={assignedDriver.profile_photo} className="w-full h-full object-cover" />
                  ) : (
                    assignedDriver.full_name?.[0] || "D"
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{assignedDriver.full_name}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge className="bg-blue-500/20 text-blue-300 text-xs">
                      {assignedDriver.driver_vehicle_info.color} {assignedDriver.driver_vehicle_info.make} {assignedDriver.driver_vehicle_info.model}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    {assignedDriver.driver_vehicle_info.license_plate}
                  </p>
                </div>
              </div>
            </div>
          )}

          {requestSubmitted && !assignedDriver ? (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
              <p className="text-blue-300 font-medium">Finding your driver...</p>
              <p className="text-blue-200 text-sm mt-1">This usually takes 30-60 seconds</p>
            </div>
          ) : (
            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700" 
              onClick={requestRide} 
              disabled={!pickup || !dropoff}
            >
              {isGroupBooking 
                ? `Book ${vehiclesNeeded} Vehicles` 
                : isShared 
                ? 'Create Shared Ride' 
                : 'Request Ride'} {!isGroupBooking && '(First Ride Free)'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
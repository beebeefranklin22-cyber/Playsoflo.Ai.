import React, { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { Navigation, MapPin, Clock, ExternalLink, AlertTriangle, TrendingUp, X, Volume2, VolumeX, RefreshCw, MapPinned } from "lucide-react";
import L from "leaflet";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

// Decode polyline algorithm (Google encoded polyline format)
const decodePolyline = (encoded) => {
  const coords = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
};

function MapUpdater({ center, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds([[bounds.southwest.lat, bounds.southwest.lng], [bounds.northeast.lat, bounds.northeast.lng]]);
    } else if (center) {
      map.setView(center, 13);
    }
  }, [center, bounds, map]);
  return null;
}

export default function NavigationModal({ open, onClose, ride }) {
  const [directions, setDirections] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [geofenceInfo, setGeofenceInfo] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [distanceToNextTurn, setDistanceToNextTurn] = useState(null);
  const [navigationPhase, setNavigationPhase] = useState('pickup'); // 'pickup' or 'dropoff'
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [reroutingInProgress, setReroutingInProgress] = useState(false);
  const [trafficCheckInterval, setTrafficCheckInterval] = useState(null);
  const lastSpokenStep = useRef(-1);
  const rerouteThreshold = 100; // meters off route before re-routing

  useEffect(() => {
    if (ride?.pickup_coords && open) {
      fetchDirections();
      checkGeofence();
      startLocationTracking();
      startTrafficMonitoring();
    }
    return () => {
      if (window.navigationWatcher) {
        navigator.geolocation.clearWatch(window.navigationWatcher);
      }
      if (trafficCheckInterval) {
        clearInterval(trafficCheckInterval);
      }
    };
  }, [ride, open, navigationPhase]);

  // Real-time location tracking for navigation
  const startLocationTracking = () => {
    if (navigator.geolocation) {
      window.navigationWatcher = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = [position.coords.latitude, position.coords.longitude];
          setCurrentLocation(newLocation);
          
          // Check if off-route and trigger re-routing
          if (directions?.steps && currentStepIndex < directions.steps.length) {
            checkIfOffRoute(newLocation);
          }
          
          // Auto-advance to next step based on proximity
          if (autoAdvance && directions?.steps && currentStepIndex < directions.steps.length - 1) {
            const currentStep = directions.steps[currentStepIndex];
            const stepLocation = currentStep.end_location;
            if (stepLocation) {
              const distance = calculateDistance(
                newLocation[0], newLocation[1],
                stepLocation.lat, stepLocation.lng
              );
              setDistanceToNextTurn(distance);
              
              // Auto-advance when within 50 meters of turn
              if (distance < 0.05) {
                const nextIndex = currentStepIndex + 1;
                setCurrentStepIndex(nextIndex);
                
                // Announce next turn via voice
                if (voiceEnabled && nextIndex !== lastSpokenStep.current) {
                  speakInstruction(directions.steps[nextIndex]);
                  lastSpokenStep.current = nextIndex;
                }
              }
              
              // Announce when approaching turn (200m)
              if (voiceEnabled && distance < 0.2 && distance > 0.19 && currentStepIndex !== lastSpokenStep.current) {
                speakInstruction(currentStep, true);
                lastSpokenStep.current = currentStepIndex;
              }
            }
          }
          
          // Check if reached destination
          if (navigationPhase === 'pickup' && ride?.pickup_coords) {
            const distToPickup = calculateDistance(
              newLocation[0], newLocation[1],
              ride.pickup_coords[0], ride.pickup_coords[1]
            );
            if (distToPickup < 0.05) {
              handleReachedPickup();
            }
          } else if (navigationPhase === 'dropoff' && ride?.dropoff_coords) {
            const distToDropoff = calculateDistance(
              newLocation[0], newLocation[1],
              ride.dropoff_coords[0], ride.dropoff_coords[1]
            );
            if (distToDropoff < 0.05) {
              handleReachedDropoff();
            }
          }
        },
        (error) => console.log('Location tracking error:', error),
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  const fetchDirections = async (fromLocation = null) => {
    setLoading(true);
    try {
      const origin = fromLocation || currentLocation || 'current location';
      const destination = navigationPhase === 'pickup' ? ride.pickup_coords : ride.dropoff_coords;
      
      const response = await base44.functions.invoke('getDirections', {
        origin,
        destination,
        mode: 'driving'
      });

      if (response.data && !response.data.error) {
        setDirections(response.data);
        setCurrentStepIndex(0);
        lastSpokenStep.current = -1;
        
        if (voiceEnabled) {
          const phase = navigationPhase === 'pickup' ? 'pickup location' : 'drop-off location';
          speak(`Navigation started to ${phase}. Distance: ${response.data.distance.text}. Time: ${response.data.duration.text}`);
        }
      }
    } catch (err) {
      console.error('Failed to get directions:', err);
      toast.error('Failed to load directions');
    } finally {
      setLoading(false);
    }
  };

  const checkGeofence = async () => {
    try {
      const response = await base44.functions.invoke('checkGeofence', {
        lat: ride.pickup_coords[0],
        lng: ride.pickup_coords[1]
      });

      if (response.data?.in_geofenced_area) {
        setGeofenceInfo(response.data.zones[0]);
      }
    } catch (err) {
      console.error('Geofence check failed:', err);
    }
  };

  // Voice Navigation
  const speak = (text) => {
    if ('speechSynthesis' in window && voiceEnabled) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakInstruction = (step, approaching = false) => {
    if (!step || !voiceEnabled) return;
    const prefix = approaching ? `In ${step.distance}, ` : '';
    speak(prefix + step.instruction);
  };

  // Check if driver is off-route
  const checkIfOffRoute = (currentPos) => {
    if (!directions?.polyline || reroutingInProgress) return;
    
    const routeCoords = decodePolyline(directions.polyline);
    let minDistance = Infinity;
    
    for (const coord of routeCoords) {
      const dist = calculateDistance(currentPos[0], currentPos[1], coord[0], coord[1]);
      if (dist < minDistance) minDistance = dist;
    }
    
    // If more than 100m off route, re-route
    if (minDistance > 0.1) {
      handleReroute();
    }
  };

  // Handle re-routing
  const handleReroute = async () => {
    if (reroutingInProgress) return;
    
    setReroutingInProgress(true);
    toast.info('Re-routing based on your location...');
    
    if (voiceEnabled) {
      speak('Re-routing');
    }
    
    await fetchDirections(currentLocation);
    
    setTimeout(() => setReroutingInProgress(false), 5000);
  };

  // Monitor traffic and re-route if needed
  const startTrafficMonitoring = () => {
    const interval = setInterval(async () => {
      if (!currentLocation || !directions) return;
      
      // Re-fetch route to check for traffic updates
      const destination = navigationPhase === 'pickup' ? ride.pickup_coords : ride.dropoff_coords;
      try {
        const response = await base44.functions.invoke('getDirections', {
          origin: currentLocation,
          destination,
          mode: 'driving'
        });
        
        if (response.data && response.data.duration) {
          const newDuration = response.data.duration.minutes;
          const currentDuration = directions.duration.minutes;
          
          // If route is now 30% slower, suggest re-route
          if (newDuration > currentDuration * 1.3) {
            toast.warning('Heavy traffic detected!', {
              description: 'Re-routing to save time...',
              duration: 4000
            });
            if (voiceEnabled) {
              speak('Heavy traffic ahead. Finding faster route.');
            }
            await handleReroute();
          }
        }
      } catch (err) {
        console.log('Traffic check skipped:', err);
      }
    }, 120000); // Check every 2 minutes
    
    setTrafficCheckInterval(interval);
  };

  // Handle reaching pickup location
  const handleReachedPickup = () => {
    toast.success('Arrived at pickup!');
    speak('You have arrived at the pickup location');
    
    // Update ride status
    base44.entities.RideRequest.update(ride.id, {
      status: 'arrived'
    });
    
    // Notify passenger
    base44.entities.Notification.create({
      recipient_email: ride.created_by,
      type: "ride_update",
      title: "📍 Driver Has Arrived!",
      message: `Your driver is at the pickup location`,
      reference_type: "ride",
      reference_id: ride.id,
      read: false
    });
  };

  // Handle reaching dropoff location
  const handleReachedDropoff = () => {
    toast.success('Arrived at destination!');
    speak('You have arrived at the destination');
    
    // Update ride status
    base44.entities.RideRequest.update(ride.id, {
      status: 'completed',
      end_time: new Date().toISOString()
    });
    
    onClose();
  };

  // Switch to dropoff navigation
  const switchToDropoff = () => {
    setNavigationPhase('dropoff');
    setCurrentStepIndex(0);
    setDirections(null);
    toast.info('Navigating to drop-off location');
    
    // Update ride status to in_progress
    base44.entities.RideRequest.update(ride.id, {
      status: 'in_progress'
    });
  };

  const openInGoogleMaps = () => {
    const address = navigationPhase === 'pickup' ? ride.pickup_address : ride.dropoff_address;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  if (!ride) return null;

  const routeCoordinates = directions?.polyline 
    ? decodePolyline(directions.polyline)
    : [];

  const currentStep = directions?.steps?.[currentStepIndex];
  const trafficDelay = directions?.duration_in_traffic && directions?.duration
    ? directions.duration_in_traffic.minutes - directions.duration.minutes
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Navigation className="w-6 h-6 text-blue-400" />
              {navigationPhase === 'pickup' ? 'Navigate to Pickup' : 'Navigate to Drop-off'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full">
                <Volume2 className={`w-4 h-4 ${voiceEnabled ? 'text-green-400' : 'text-gray-400'}`} />
                <Switch
                  checked={voiceEnabled}
                  onCheckedChange={(checked) => {
                    setVoiceEnabled(checked);
                    speak(checked ? 'Voice navigation enabled' : 'Voice navigation disabled');
                  }}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Geofence Alert */}
          {geofenceInfo && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <div className="text-yellow-300 font-bold">{geofenceInfo.name}</div>
                  <div className="text-yellow-200 text-sm">{geofenceInfo.rules.message}</div>
                  {geofenceInfo.rules.pickup_fee && (
                    <div className="text-yellow-300 text-sm mt-1">
                      Additional fee: ${geofenceInfo.rules.pickup_fee.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Phase Indicator */}
          <div className="flex items-center gap-3">
            <div className={`flex-1 p-3 rounded-lg border-2 ${
              navigationPhase === 'pickup' 
                ? 'bg-blue-500/20 border-blue-500' 
                : 'bg-white/5 border-white/10'
            }`}>
              <div className="flex items-center gap-2">
                <MapPin className={`w-4 h-4 ${navigationPhase === 'pickup' ? 'text-blue-400' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${navigationPhase === 'pickup' ? 'text-blue-300' : 'text-gray-400'}`}>
                  Pickup
                </span>
              </div>
            </div>
            <div className={`flex-1 p-3 rounded-lg border-2 ${
              navigationPhase === 'dropoff' 
                ? 'bg-purple-500/20 border-purple-500' 
                : 'bg-white/5 border-white/10'
            }`}>
              <div className="flex items-center gap-2">
                <MapPinned className={`w-4 h-4 ${navigationPhase === 'dropoff' ? 'text-purple-400' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${navigationPhase === 'dropoff' ? 'text-purple-300' : 'text-gray-400'}`}>
                  Drop-off
                </span>
              </div>
            </div>
          </div>

          {/* Traffic & Re-routing Alert */}
          {trafficDelay > 2 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-400" />
                <span className="text-red-300 text-sm">
                  Heavy traffic detected - {trafficDelay} min delay
                </span>
              </div>
              <Button
                onClick={handleReroute}
                disabled={reroutingInProgress}
                size="sm"
                className="bg-red-500 hover:bg-red-600"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${reroutingInProgress ? 'animate-spin' : ''}`} />
                Re-route
              </Button>
            </div>
          )}
          
          {reroutingInProgress && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-blue-300 text-sm">
                Finding optimal route...
              </span>
            </div>
          )}

          {/* Map */}
          <div className="h-96 rounded-xl overflow-hidden border border-white/20">
            {loading ? (
              <div className="h-full flex items-center justify-center bg-white/5">
                <div className="text-white">Loading directions...</div>
              </div>
            ) : (
              <MapContainer
                center={
                  ride.pickup_coords && Array.isArray(ride.pickup_coords) && ride.pickup_coords.length === 2
                    ? ride.pickup_coords
                    : ride.pickup_coords && ride.pickup_coords.lat && ride.pickup_coords.lng
                    ? [ride.pickup_coords.lat, ride.pickup_coords.lng]
                    : [25.7617, -80.1918]
                }
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {ride.pickup_coords && ride.pickup_coords.lat && ride.pickup_coords.lng && (
                  <Marker position={[ride.pickup_coords.lat, ride.pickup_coords.lng]} />
                )}
                {ride.pickup_coords && Array.isArray(ride.pickup_coords) && ride.pickup_coords.length === 2 && (
                  <Marker position={ride.pickup_coords} />
                )}

                {/* Current Location Marker */}
                {currentLocation && (
                  <Marker 
                    position={currentLocation}
                    icon={L.divIcon({
                      className: 'custom-current-location',
                      html: '<div style="width: 20px; height: 20px; background: #3B82F6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>',
                      iconSize: [20, 20]
                    })}
                  />
                )}
                
                {routeCoordinates.length > 0 && (
                  <Polyline 
                    positions={routeCoordinates} 
                    color={trafficDelay > 3 ? "#EF4444" : trafficDelay > 1 ? "#F59E0B" : "#3B82F6"}
                    weight={5}
                    opacity={0.8}
                  />
                )}

                {directions?.bounds && (
                  <MapUpdater bounds={directions.bounds} />
                )}
              </MapContainer>
            )}
          </div>

          {/* Current Turn-by-Turn Instruction */}
          {currentStep && (
            <div className="space-y-3">
              <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                    <Navigation className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold text-xl mb-1">{currentStep.instruction}</div>
                    <div className="text-gray-400 text-sm flex items-center gap-3">
                      <span>{currentStep.distance}</span>
                      {distanceToNextTurn !== null && (
                        <span className="text-yellow-400 font-bold">
                          {(distanceToNextTurn * 1000).toFixed(0)}m away
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                      disabled={currentStepIndex === 0}
                      variant="outline"
                      className="w-10"
                    >
                      ←
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setCurrentStepIndex(Math.min(directions.steps.length - 1, currentStepIndex + 1))}
                      disabled={currentStepIndex === directions.steps.length - 1}
                      variant="outline"
                      className="w-10"
                    >
                      →
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-400">Step {currentStepIndex + 1} of {directions.steps.length}</span>
                  <button
                    onClick={() => setAutoAdvance(!autoAdvance)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      autoAdvance ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    Auto-advance: {autoAdvance ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Next Step Preview */}
              {directions.steps[currentStepIndex + 1] && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="text-gray-400 text-xs mb-1">NEXT</div>
                  <div className="text-white text-sm">
                    {directions.steps[currentStepIndex + 1].instruction}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ride Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <MapPin className="w-4 h-4" />
                Pickup Location
              </div>
              <div className="text-white font-medium">{ride.pickup_address}</div>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Clock className="w-4 h-4" />
                Estimated Arrival
              </div>
              <div className="text-white font-medium text-2xl">
                {directions?.duration_in_traffic?.minutes || directions?.duration?.minutes || ride?.estimated_duration_minutes || 10} min
                {trafficDelay > 0 && (
                  <Badge className="ml-2 bg-red-500/20 text-red-300 text-xs">
                    +{trafficDelay}m traffic
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Distance & Fare */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Distance</div>
              <div className="text-white font-medium text-xl">
                {directions?.distance?.miles || ride?.estimated_distance_miles || '~5'} mi
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">You'll Earn</div>
              <div className="text-green-400 text-xl font-bold">
                ${((ride?.fare_breakdown?.total_fare || 15) * 0.9).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {navigationPhase === 'pickup' && (
              <Button
                onClick={switchToDropoff}
                className="bg-purple-600 hover:bg-purple-700 text-lg py-6"
              >
                <MapPinned className="w-5 h-5 mr-2" />
                Go to Drop-off
              </Button>
            )}
            <Button
              onClick={handleReroute}
              disabled={reroutingInProgress}
              variant="outline"
              className={`bg-white/5 border-white/20 text-white hover:bg-white/10 text-lg py-6 ${
                navigationPhase === 'pickup' ? '' : 'col-span-2'
              }`}
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${reroutingInProgress ? 'animate-spin' : ''}`} />
              Re-route Now
            </Button>
          </div>
          
          <Button
            onClick={openInGoogleMaps}
            variant="outline"
            className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Open in Google Maps
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
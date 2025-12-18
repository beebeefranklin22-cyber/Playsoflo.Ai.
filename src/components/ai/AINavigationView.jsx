import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { Navigation, X, MapPin, Clock, TrendingUp, ExternalLink, ChevronRight, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";

// Decode polyline
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
      map.fitBounds([[bounds.southwest.lat, bounds.southwest.lng], [bounds.northeast.lat, bounds.northeast.lng]], { 
        padding: [80, 80],
        maxZoom: 17,
        animate: true,
        duration: 0.5
      });
    } else if (center) {
      map.setView(center, 17, { 
        animate: true,
        duration: 0.3,
        easeLinearity: 0.25
      });
    }
  }, [center, bounds, map]);
  return null;
}

export default function AINavigationView({ navigationData, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [navigationStarted, setNavigationStarted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(
    navigationData?.originCoords 
      ? [navigationData.originCoords.lat, navigationData.originCoords.lng]
      : null
  );
  const [announcedSteps, setAnnouncedSteps] = useState(new Set());
  const [animatedDash, setAnimatedDash] = useState(0);

  // Animate route dash
  useEffect(() => {
    if (!navigationStarted) return;
    const interval = setInterval(() => {
      setAnimatedDash(prev => (prev + 1) % 40);
    }, 100);
    return () => clearInterval(interval);
  }, [navigationStarted]);

  // Voice announcement function
  const speak = (text, priority = false) => {
    if (!('speechSynthesis' in window)) return;
    
    if (priority) {
      window.speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';
    
    window.speechSynthesis.speak(utterance);
  };

  // Calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    // Track user location in real-time with high accuracy
    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = [position.coords.latitude, position.coords.longitude];
        setCurrentLocation(newLocation);

        // Voice guidance based on location
        if (navigationStarted && directions?.steps) {
          const currentStep = directions.steps[currentStepIndex];
          if (currentStep?.start_location) {
            const distanceToStep = calculateDistance(
              position.coords.latitude,
              position.coords.longitude,
              currentStep.start_location.lat,
              currentStep.start_location.lng
            );

            // Announce 500 feet before turn (approximately 0.095 miles)
            const stepKey = `${currentStepIndex}_warning`;
            if (distanceToStep < 0.095 && !announcedSteps.has(stepKey)) {
              speak(`In 500 feet, ${currentStep.instruction}`, true);
              setAnnouncedSteps(prev => new Set(prev).add(stepKey));
            }

            // Announce when reaching turn
            const reachedKey = `${currentStepIndex}_reached`;
            if (distanceToStep < 0.02 && !announcedSteps.has(reachedKey)) {
              speak(currentStep.instruction, true);
              setAnnouncedSteps(prev => new Set(prev).add(reachedKey));
              
              // Auto advance to next step
              if (currentStepIndex < directions.steps.length - 1) {
                setTimeout(() => setCurrentStepIndex(prev => prev + 1), 2000);
              }
            }
          }
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 0,
        timeout: 5000
      }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, [navigationStarted, currentStepIndex, announcedSteps, directions]);

  const directions = navigationData?.directions;
  const routeCoordinates = directions?.polyline ? decodePolyline(directions.polyline) : [];
  const currentStep = directions?.steps?.[currentStepIndex];
  const trafficDelay = directions?.duration_in_traffic && directions?.duration
    ? directions.duration_in_traffic.minutes - directions.duration.minutes
    : 0;

  const handleStartNavigation = () => {
    setNavigationStarted(true);
    toast.success('Navigation started!');
    
    // Initial announcement
    const firstStep = directions?.steps?.[0];
    if (firstStep) {
      speak(`Starting navigation to ${navigationData.destination}. ${firstStep.instruction}`, true);
    }
  };

  const handleEndNavigation = () => {
    speak('You have arrived at your destination!', true);
    toast.success('You have arrived at your destination!');
    setTimeout(() => onClose(), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 bg-gray-950 flex flex-col"
    >
      {/* Header */}
      <div className="glass-effect border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold">Navigation</h2>
            <p className="text-gray-400 text-xs">{navigationData?.destination}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={currentLocation || (navigationData?.originCoords ? [navigationData.originCoords.lat, navigationData.originCoords.lng] : [25.7617, -80.1918])}
          zoom={16}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          maxZoom={19}
          minZoom={10}
          preferCanvas={true}
          updateWhenIdle={false}
          updateWhenZooming={false}
          keepBuffer={4}
        >
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            updateWhenIdle={false}
            updateWhenZooming={false}
            keepBuffer={4}
          />
          
          {/* Current Location - Enhanced visibility for driving */}
          {currentLocation && (
            <>
              <Marker 
                position={currentLocation}
                icon={L.divIcon({
                  className: 'current-location-marker',
                  html: `
                    <div style="position: relative; width: 30px; height: 30px;">
                      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background: #3B82F6; border: 4px solid white; border-radius: 50%; box-shadow: 0 0 20px rgba(59, 130, 246, 1), 0 0 40px rgba(59, 130, 246, 0.5);"></div>
                      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: rgba(59, 130, 246, 0.2); border-radius: 50%; animation: pulse 2s infinite;"></div>
                    </div>
                  `,
                  iconSize: [30, 30]
                })}
              />
              <style>{`
                @keyframes pulse {
                  0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                  100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
                }
              `}</style>
            </>
          )}

          {/* Destination */}
          {navigationData?.destinationCoords && Array.isArray(navigationData.destinationCoords) && (
            <Marker position={navigationData.destinationCoords} />
          )}
          {navigationData?.directions?.end_location && (
            <Marker position={[navigationData.directions.end_location.lat, navigationData.directions.end_location.lng]} />
          )}

          {/* Route - Enhanced with animation and direction arrows */}
          {routeCoordinates.length > 0 && (
            <>
              {/* Background glow */}
              <Polyline 
                positions={routeCoordinates} 
                color={trafficDelay > 3 ? "#EF4444" : trafficDelay > 1 ? "#F59E0B" : "#3B82F6"}
                weight={16}
                opacity={0.2}
              />
              {/* Outer route */}
              <Polyline 
                positions={routeCoordinates} 
                color={trafficDelay > 3 ? "#EF4444" : trafficDelay > 1 ? "#F59E0B" : "#3B82F6"}
                weight={12}
                opacity={0.5}
              />
              {/* Main animated route */}
              <Polyline 
                positions={routeCoordinates} 
                color={trafficDelay > 3 ? "#EF4444" : trafficDelay > 1 ? "#F59E0B" : "#3B82F6"}
                weight={8}
                opacity={1}
                dashArray={navigationStarted ? "20, 20" : null}
                dashOffset={navigationStarted ? animatedDash : 0}
              />
              
              {/* Direction arrows along route */}
              {navigationStarted && routeCoordinates.filter((_, idx) => idx % 15 === 0).map((coord, idx) => (
                <Marker
                  key={`arrow-${idx}`}
                  position={coord}
                  icon={L.divIcon({
                    className: 'route-arrow',
                    html: `
                      <div style="
                        width: 0; 
                        height: 0; 
                        border-left: 8px solid transparent;
                        border-right: 8px solid transparent;
                        border-bottom: 16px solid ${trafficDelay > 3 ? "#EF4444" : trafficDelay > 1 ? "#F59E0B" : "#3B82F6"};
                        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                        animation: arrowPulse 1.5s ease-in-out infinite;
                      "></div>
                      <style>
                        @keyframes arrowPulse {
                          0%, 100% { opacity: 0.6; transform: translateY(0px); }
                          50% { opacity: 1; transform: translateY(-3px); }
                        }
                      </style>
                    `,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                  })}
                />
              ))}
            </>
          )}

          {/* Map centering logic */}
          {directions?.bounds ? (
            <MapUpdater bounds={directions.bounds} />
          ) : currentLocation ? (
            <MapUpdater center={currentLocation} />
          ) : null}
        </MapContainer>

        {/* ETA Overlay - Enhanced for driving */}
        {directions && (
          <div className="absolute top-4 left-4 right-4 z-10 bg-gray-900/95 backdrop-blur-xl rounded-2xl p-5 border-2 border-blue-500/50 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-400 text-5xl font-black tracking-tight">
                  {directions.duration_in_traffic?.minutes || directions.duration?.minutes}
                  <span className="text-2xl ml-2">min</span>
                </div>
                <div className="text-gray-300 text-base font-bold mt-1">
                  {directions.distance?.miles} miles away
                  {trafficDelay > 1 && (
                    <Badge className="ml-2 bg-red-500/30 text-red-300 text-sm font-bold px-2 py-1">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      +{trafficDelay}m delay
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {navigationStarted ? (
                  <Button
                    onClick={handleEndNavigation}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 font-bold text-base"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Arrived
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartNavigation}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 font-bold text-base"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start
                  </Button>
                )}
                <Button
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(navigationData.destination)}`, '_blank')}
                  size="lg"
                  variant="outline"
                  className="bg-white/10 border-white/20 font-bold text-base"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Maps
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Start Navigation Overlay */}
        <AnimatePresence>
          {!navigationStarted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 max-w-md mx-4 text-center shadow-2xl"
              >
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Navigation className="w-10 h-10 text-white animate-pulse" />
                </div>
                <h3 className="text-white text-3xl font-black mb-2">Ready to Navigate?</h3>
                <p className="text-blue-100 mb-6">
                  Turn-by-turn directions to {navigationData?.destination}
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1 bg-white/10 border-white/30 hover:bg-white/20 text-white font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStartNavigation}
                    className="flex-1 bg-white hover:bg-gray-100 text-blue-600 font-bold shadow-lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Navigation
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Turn-by-Turn Instructions */}
      <div className="glass-effect border-t border-white/10 p-4 max-h-72 overflow-y-auto">
        {currentStep && (
          <div className="mb-4">
            <div className="bg-gradient-to-br from-blue-600/30 to-purple-600/30 border-3 border-blue-400 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl">
                  <Navigation className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-black text-2xl mb-2 leading-tight">{currentStep.instruction}</div>
                  <div className="text-blue-200 text-base font-bold">{currentStep.distance} • {currentStep.duration}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const newIndex = Math.max(0, currentStepIndex - 1);
                      setCurrentStepIndex(newIndex);
                      speak(directions.steps[newIndex].instruction);
                    }}
                    disabled={currentStepIndex === 0}
                    className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-xl disabled:opacity-30 text-white font-bold text-xl"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => {
                      const newIndex = Math.min(directions.steps.length - 1, currentStepIndex + 1);
                      setCurrentStepIndex(newIndex);
                      speak(directions.steps[newIndex].instruction);
                    }}
                    disabled={currentStepIndex === directions.steps.length - 1}
                    className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-xl disabled:opacity-30 text-white font-bold text-xl"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-blue-200 text-sm font-bold">
                  Step {currentStepIndex + 1} of {directions.steps.length}
                </div>
                {directions.steps[currentStepIndex + 1] && (
                  <div className="text-gray-400 text-xs">
                    Next: {directions.steps[currentStepIndex + 1].instruction.substring(0, 40)}...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* All Steps List */}
        <div className="space-y-2">
          <div className="text-gray-400 text-xs font-semibold mb-2">ALL STEPS</div>
          {directions?.steps?.map((step, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStepIndex(idx)}
              className={`w-full text-left p-3 rounded-lg transition ${
                idx === currentStepIndex 
                  ? 'bg-blue-600/20 border border-blue-500' 
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === currentStepIndex ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-400'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">{step.instruction}</div>
                  <div className="text-gray-400 text-xs">{step.distance}</div>
                </div>
                {idx === currentStepIndex && (
                  <ChevronRight className="w-4 h-4 text-blue-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
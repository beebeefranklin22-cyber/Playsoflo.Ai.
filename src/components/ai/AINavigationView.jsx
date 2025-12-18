import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { Navigation, X, MapPin, Clock, TrendingUp, ExternalLink, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
      map.fitBounds([[bounds.southwest.lat, bounds.southwest.lng], [bounds.northeast.lat, bounds.northeast.lng]], { padding: [50, 50] });
    } else if (center) {
      map.setView(center, 14, { animate: true });
    }
  }, [center, bounds, map]);
  return null;
}

export default function AINavigationView({ navigationData, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentLocation, setCurrentLocation] = useState(
    navigationData?.originCoords 
      ? [navigationData.originCoords.lat, navigationData.originCoords.lng]
      : null
  );

  useEffect(() => {
    // Track user location in real-time with high accuracy
    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation([position.coords.latitude, position.coords.longitude]);
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
  }, []);

  const directions = navigationData?.directions;
  const routeCoordinates = directions?.polyline ? decodePolyline(directions.polyline) : [];
  const currentStep = directions?.steps?.[currentStepIndex];
  const trafficDelay = directions?.duration_in_traffic && directions?.duration
    ? directions.duration_in_traffic.minutes - directions.duration.minutes
    : 0;

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
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {/* Current Location */}
          {currentLocation && (
            <Marker 
              position={currentLocation}
              icon={L.divIcon({
                className: 'current-location-marker',
                html: '<div style="width: 16px; height: 16px; background: #3B82F6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(59, 130, 246, 0.8);"></div>',
                iconSize: [16, 16]
              })}
            />
          )}

          {/* Destination */}
          {navigationData?.destinationCoords && Array.isArray(navigationData.destinationCoords) && (
            <Marker position={navigationData.destinationCoords} />
          )}
          {navigationData?.directions?.end_location && (
            <Marker position={[navigationData.directions.end_location.lat, navigationData.directions.end_location.lng]} />
          )}

          {/* Route */}
          {routeCoordinates.length > 0 && (
            <Polyline 
              positions={routeCoordinates} 
              color={trafficDelay > 3 ? "#EF4444" : trafficDelay > 1 ? "#F59E0B" : "#3B82F6"}
              weight={6}
              opacity={0.8}
            />
          )}

          {/* Map centering logic */}
          {directions?.bounds ? (
            <MapUpdater bounds={directions.bounds} />
          ) : currentLocation ? (
            <MapUpdater center={currentLocation} />
          ) : null}
        </MapContainer>

        {/* ETA Overlay */}
        {directions && (
          <div className="absolute top-4 left-4 right-4 z-10 glass-effect rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-3xl font-bold">
                  {directions.duration_in_traffic?.minutes || directions.duration?.minutes} min
                </div>
                <div className="text-gray-400 text-sm">
                  {directions.distance?.miles} mi
                  {trafficDelay > 1 && (
                    <Badge className="ml-2 bg-red-500/20 text-red-400 text-xs">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +{trafficDelay}m traffic
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(navigationData.destination)}`, '_blank')}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Google Maps
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Turn-by-Turn Instructions */}
      <div className="glass-effect border-t border-white/10 p-4 max-h-72 overflow-y-auto">
        {currentStep && (
          <div className="mb-4">
            <div className="bg-blue-600/20 border-2 border-blue-500 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Navigation className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold text-lg mb-1">{currentStep.instruction}</div>
                  <div className="text-gray-400 text-sm">{currentStep.distance} • {currentStep.duration}</div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                    disabled={currentStepIndex === 0}
                    className="p-2 bg-white/10 rounded-lg disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setCurrentStepIndex(Math.min(directions.steps.length - 1, currentStepIndex + 1))}
                    disabled={currentStepIndex === directions.steps.length - 1}
                    className="p-2 bg-white/10 rounded-lg disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="mt-2 text-gray-400 text-xs">
                Step {currentStepIndex + 1} of {directions.steps.length}
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
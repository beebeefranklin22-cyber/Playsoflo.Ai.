import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { Navigation, MapPin, Clock, ExternalLink, AlertTriangle, TrendingUp, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
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

  useEffect(() => {
    if (ride?.pickup_coords && open) {
      fetchDirections();
      checkGeofence();
    }
  }, [ride, open]);

  const fetchDirections = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('getDirections', {
        origin: 'current location',
        destination: ride.pickup_coords,
        mode: 'driving'
      });

      if (response.data && !response.data.error) {
        setDirections(response.data);
      }
    } catch (err) {
      console.error('Failed to get directions:', err);
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

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ride.pickup_address)}`;
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
              Navigate to Pickup
            </DialogTitle>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
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

          {/* Traffic Alert */}
          {trafficDelay > 2 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-400" />
              <span className="text-red-300 text-sm">
                Heavy traffic detected - {trafficDelay} min delay
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
            <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold text-lg mb-1">{currentStep.instruction}</div>
                  <div className="text-gray-400 text-sm">{currentStep.distance} • {currentStep.duration}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                    disabled={currentStepIndex === 0}
                    variant="outline"
                  >
                    ←
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCurrentStepIndex(Math.min(directions.steps.length - 1, currentStepIndex + 1))}
                    disabled={currentStepIndex === directions.steps.length - 1}
                    variant="outline"
                  >
                    →
                  </Button>
                </div>
              </div>
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

          {/* Action Button */}
          <Button
            onClick={openInGoogleMaps}
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Open in Google Maps
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
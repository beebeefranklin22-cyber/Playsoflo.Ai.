import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const carIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3202/3202926.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 14);
    }
  }, [center, map]);
  return null;
}

export default function RideTrackingMap({ ride, driverLocation }) {
  const [directions, setDirections] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [trafficDelay, setTrafficDelay] = useState(0);

  // Default to Miami if no location
  const defaultCenter = [25.7617, -80.1918];
  
  // Handle different coordinate formats
  const getCoords = (coords) => {
    if (!coords) return defaultCenter;
    if (Array.isArray(coords) && coords.length === 2) return coords;
    if (coords.lat && coords.lng) return [coords.lat, coords.lng];
    return defaultCenter;
  };
  
  const pickupCoords = getCoords(ride?.pickup_coords);
  const driverCoords = driverLocation && driverLocation.lat && driverLocation.lng 
    ? [driverLocation.lat, driverLocation.lng] 
    : null;

  useEffect(() => {
    if (driverCoords && pickupCoords) {
      fetchRealTimeDirections();
    }
  }, [driverCoords, pickupCoords]);

  const fetchRealTimeDirections = async () => {
    try {
      const response = await base44.functions.invoke('getDirections', {
        origin: driverCoords,
        destination: pickupCoords,
        mode: 'driving'
      });

      if (response.data && !response.data.error) {
        setDirections(response.data);
        
        if (response.data.polyline) {
          const decoded = decodePolyline(response.data.polyline);
          setRouteCoords(decoded);
        }

        if (response.data.duration_in_traffic && response.data.duration) {
          const delay = response.data.duration_in_traffic.minutes - response.data.duration.minutes;
          setTrafficDelay(delay);
        }
      }
    } catch (err) {
      console.error('Failed to get directions:', err);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 overflow-hidden">
      <CardContent className="p-0">
        <div className="relative">
          <MapContainer
            center={driverCoords || pickupCoords}
            zoom={14}
            style={{ height: "400px", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            
            {/* Pickup Location */}
            {pickupCoords && pickupCoords.length === 2 && (
              <Marker position={pickupCoords}>
                <Popup>
                  <div className="text-sm">
                    <strong>Pickup Location</strong>
                    <br />
                    {ride.pickup_address}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Driver Location */}
            {driverCoords && (
              <Marker position={driverCoords} icon={carIcon}>
                <Popup>
                  <div className="text-sm">
                    <strong>Your Driver</strong>
                    <br />
                    On the way!
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Route Polyline with Traffic Colors */}
            {routeCoords.length > 0 && (
              <Polyline
                positions={routeCoords}
                color={trafficDelay > 3 ? "#EF4444" : trafficDelay > 1 ? "#F59E0B" : "#3B82F6"}
                weight={6}
                opacity={0.7}
              />
            )}

            <MapUpdater center={driverCoords || pickupCoords} />
          </MapContainer>

          {/* Overlay Info */}
          <div className="absolute top-4 left-4 right-4 z-10 space-y-2">
            <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={`${
                    ride.status === 'accepted' ? 'bg-blue-500/20 text-blue-700 border-blue-500/30 animate-pulse' :
                    ride.status === 'en_route' ? 'bg-purple-500/20 text-purple-700 border-purple-500/30 animate-pulse' :
                    'bg-green-500/20 text-green-700 border-green-500/30'
                  }`}>
                    {ride.status === 'accepted' ? '📍 Driver Arrived' : 
                     ride.status === 'en_route' ? '🚗 Driver En Route' : 
                     'Driver On The Way'}
                  </Badge>
                  {directions?.duration_in_traffic && ride.status === 'en_route' && (
                    <div className="flex items-center gap-1 text-sm text-gray-700 font-bold">
                      <Clock className="w-4 h-4" />
                      {directions.duration_in_traffic.minutes} min away
                      {trafficDelay > 2 && (
                        <Badge className="ml-2 bg-red-500/20 text-red-700 text-xs">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          +{trafficDelay}m traffic
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">
                    {ride.driver_email?.split('@')[0] || 'Driver'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {ride.ride_type.toUpperCase()} • Heading to pickup
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { Navigation, MapPin, Package, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import "leaflet/dist/leaflet.css";

// Decode Google/Mapbox encoded polyline into [lat, lng] pairs
const decodePolyline = (encoded) => {
  const coords = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
};

export default function LiveGPSTracking({ delivery, driverLocation }) {
  const [eta, setEta] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);

  // Fetch the real road route (Mapbox via getDirections) from driver to delivery
  useEffect(() => {
    let cancelled = false;
    const fetchRoute = async () => {
      if (!driverLocation || !delivery.delivery_coords) return;
      try {
        const res = await base44.functions.invoke('getDirections', {
          origin: driverLocation,
          destination: delivery.delivery_coords,
          mode: 'driving'
        });
        if (cancelled) return;
        if (res.data?.polyline) {
          setRouteCoords(decodePolyline(res.data.polyline));
        }
        // Use the real road-based ETA when available
        const mins = res.data?.duration_in_traffic?.minutes || res.data?.duration?.minutes;
        if (mins) setEta(mins);
      } catch {
        // Keep straight-line fallback below
      }
    };
    fetchRoute();
    return () => { cancelled = true; };
  }, [driverLocation, delivery.delivery_coords]);

  useEffect(() => {
    if (eta === null && driverLocation && delivery.delivery_coords) {
      // Straight-line ETA fallback
      const R = 3959; // Earth radius in miles
      const lat1 = driverLocation[0] * Math.PI / 180;
      const lat2 = delivery.delivery_coords[0] * Math.PI / 180;
      const deltaLat = (delivery.delivery_coords[0] - driverLocation[0]) * Math.PI / 180;
      const deltaLng = (delivery.delivery_coords[1] - driverLocation[1]) * Math.PI / 180;

      const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      setEta(Math.ceil((distance / 30) * 60));
    }
  }, [driverLocation, delivery, eta]);

  const center = delivery.pickup_coords || [25.7617, -80.1918];
  const zoom = 13;

  return (
    <div className="space-y-4">
      {/* Live Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/30 rounded-full flex items-center justify-center relative">
              <Navigation className="w-6 h-6 text-blue-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div>
              <p className="text-white font-bold">Driver En Route</p>
              <p className="text-blue-300 text-sm">Live tracking active</p>
            </div>
          </div>
          {eta && (
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span className="text-white text-2xl font-bold">{eta}</span>
                <span className="text-gray-400 text-sm">min</span>
              </div>
              <p className="text-gray-400 text-xs">Estimated arrival</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Map */}
      <div className="h-96 rounded-xl overflow-hidden border border-white/10">
        <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          {/* Pickup Location */}
          {delivery.pickup_coords && (
            <Marker position={delivery.pickup_coords}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">📍 Pickup Location</p>
                  <p className="text-gray-600">{delivery.pickup_address}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Delivery Location */}
          {delivery.delivery_coords && (
            <Marker position={delivery.delivery_coords}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">🎯 Delivery Location</p>
                  <p className="text-gray-600">{delivery.delivery_address}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Driver Location */}
          {driverLocation && (
            <Marker position={driverLocation}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">🚚 Driver Location</p>
                  <p className="text-gray-600">Live tracking</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Real road route (Mapbox) with straight-line fallback */}
          {routeCoords.length > 1 ? (
            <Polyline
              positions={routeCoords}
              color="#3B82F6"
              weight={5}
              opacity={0.85}
            />
          ) : driverLocation && delivery.delivery_coords && (
            <Polyline 
              positions={[driverLocation, delivery.delivery_coords]} 
              color="blue"
              weight={3}
              opacity={0.7}
              dashArray="8, 10"
            />
          )}
        </MapContainer>
      </div>

      {/* Location Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-400 mt-1" />
            <div>
              <p className="text-gray-400 text-xs mb-1">Pickup</p>
              <p className="text-white text-sm">{delivery.pickup_address}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-red-400 mt-1" />
            <div>
              <p className="text-gray-400 text-xs mb-1">Delivery</p>
              <p className="text-white text-sm">{delivery.delivery_address}</p>
            </div>
          </div>
        </div>
      </div>

      {driverLocation && (
        <p className="text-gray-400 text-xs text-center">
          Last updated: {delivery.driver_location_updated_at 
            ? new Date(delivery.driver_location_updated_at).toLocaleTimeString() 
            : 'Just now'}
        </p>
      )}
    </div>
  );
}
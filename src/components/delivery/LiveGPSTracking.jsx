import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { Navigation, MapPin, Package, Clock } from "lucide-react";
import { motion } from "framer-motion";
import "leaflet/dist/leaflet.css";

export default function LiveGPSTracking({ delivery, driverLocation }) {
  const [eta, setEta] = useState(null);

  useEffect(() => {
    if (driverLocation && delivery.delivery_coords) {
      // Calculate ETA based on distance
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

      // Assume 30 mph average speed
      const etaMinutes = Math.ceil((distance / 30) * 60);
      setEta(etaMinutes);
    }
  }, [driverLocation, delivery]);

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

          {/* Route Line */}
          {driverLocation && delivery.delivery_coords && (
            <Polyline 
              positions={[driverLocation, delivery.delivery_coords]} 
              color="blue"
              weight={3}
              opacity={0.7}
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
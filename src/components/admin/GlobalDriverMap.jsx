import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Car, Navigation, User, DollarSign } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Custom icons
const driverIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iIzM3MzdiNiIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjYiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const rideIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgiIGhlaWdodD0iMjgiIHZpZXdCb3g9IjAgMCAyOCAyOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNCIgY3k9IjE0IiByPSIxMiIgZmlsbD0iIzEwYjk4MSIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iMTQiIHI9IjUiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

export default function GlobalDriverMap() {
  // Fetch all online drivers
  const { data: onlineDrivers = [] } = useQuery({
    queryKey: ['admin-online-drivers'],
    queryFn: async () => {
      const users = await base44.asServiceRole.entities.User.list();
      return users.filter(u => 
        u.driver_is_online && 
        u.driver_current_lat && 
        u.driver_current_lng
      );
    },
    refetchInterval: 10000
  });

  // Fetch all active rides
  const { data: activeRides = [] } = useQuery({
    queryKey: ['admin-active-rides'],
    queryFn: async () => {
      const rides = await base44.asServiceRole.entities.RideRequest.filter({
        status: { $in: ['requested', 'accepted', 'en_route'] }
      });
      return rides.filter(r => r.pickup_coords && r.pickup_coords.length === 2);
    },
    refetchInterval: 5000
  });

  const center = [25.7617, -80.1918]; // Default: Miami

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-white/20">
      {/* Stats Overlay */}
      <div className="absolute top-4 left-4 z-[1000] space-y-2">
        <div className="bg-black/80 backdrop-blur-xl rounded-lg p-3 text-white">
          <div className="text-2xl font-bold">{onlineDrivers.length}</div>
          <div className="text-xs text-gray-400">Online Drivers</div>
        </div>
        <div className="bg-black/80 backdrop-blur-xl rounded-lg p-3 text-white">
          <div className="text-2xl font-bold text-green-400">{activeRides.length}</div>
          <div className="text-xs text-gray-400">Active Rides</div>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Online Drivers */}
        {onlineDrivers.map((driver) => (
          <Marker
            key={driver.id}
            position={[driver.driver_current_lat, driver.driver_current_lng]}
            icon={driverIcon}
          >
            <Popup>
              <div className="text-sm space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  {driver.full_name}
                </div>
                <div className="text-xs text-gray-600">{driver.email}</div>
                {driver.driver_rating && (
                  <div className="text-xs">⭐ {driver.driver_rating.toFixed(1)} ({driver.driver_total_ratings} rides)</div>
                )}
                <Badge className="bg-green-500 text-white text-xs">Online</Badge>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Active Rides */}
        {activeRides.map((ride) => (
          <React.Fragment key={ride.id}>
            <Marker position={ride.pickup_coords} icon={rideIcon}>
              <Popup>
                <div className="text-sm space-y-1">
                  <div className="font-bold">Active Ride</div>
                  <div className="text-xs"><strong>From:</strong> {ride.pickup_address}</div>
                  <div className="text-xs"><strong>To:</strong> {ride.dropoff_address}</div>
                  <div className="text-xs"><strong>Status:</strong> {ride.status}</div>
                  <div className="text-xs text-green-600 font-bold">
                    ${ride.fare_breakdown?.total_fare?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </Popup>
            </Marker>
            {ride.dropoff_coords && ride.dropoff_coords.length === 2 && (
              <Polyline
                positions={[ride.pickup_coords, ride.dropoff_coords]}
                pathOptions={{ color: '#10b981', weight: 3, opacity: 0.6 }}
              />
            )}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
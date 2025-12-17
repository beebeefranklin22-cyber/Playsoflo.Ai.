import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapPin, DollarSign, TrendingUp, Users, Navigation, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon issue
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function RealTimeDriverMap({ currentUser, driverLocation, isOnline }) {
  const [selectedRide, setSelectedRide] = useState(null);
  const [showOtherDrivers, setShowOtherDrivers] = useState(true);
  const [showDemandHotspots, setShowDemandHotspots] = useState(true);

  // Default to Miami if no location
  const defaultCenter = [25.7617, -80.1918];
  const mapCenter = driverLocation || defaultCenter;

  // Fetch available rides nearby
  const { data: availableRides = [] } = useQuery({
    queryKey: ['nearby-rides', driverLocation],
    queryFn: async () => {
      const rides = await base44.entities.RideRequest.filter({
        status: 'requested',
        driver_status: 'pending'
      });
      return rides.filter(ride => ride.pickup_coords && ride.pickup_coords.length === 2);
    },
    enabled: isOnline && !!driverLocation,
    refetchInterval: 5000
  });

  // Fetch demand insights
  const { data: demandInsights } = useQuery({
    queryKey: ['demand-insights', driverLocation],
    queryFn: async () => {
      if (!driverLocation) return null;
      const { data } = await base44.functions.invoke('getPredictiveInsights', {
        driver_email: currentUser?.email,
        current_location: driverLocation,
        time_of_day: new Date().getHours()
      });
      return data.insights;
    },
    enabled: isOnline && !!driverLocation && !!currentUser,
    refetchInterval: 60000 // Every minute
  });

  // Fetch nearby online drivers (for market saturation)
  const { data: nearbyDrivers = [] } = useQuery({
    queryKey: ['nearby-drivers', driverLocation],
    queryFn: async () => {
      const allUsers = await base44.asServiceRole.entities.User.list();
      return allUsers.filter(u => 
        u.driver_is_online && 
        u.email !== currentUser?.email &&
        u.driver_current_lat && 
        u.driver_current_lng
      );
    },
    enabled: isOnline && !!driverLocation && !!currentUser && showOtherDrivers,
    refetchInterval: 15000
  });

  // Custom icons
  const rideIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iIzEwYjk4MSIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjYiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

  const driverIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzM3MzdhNiIgZmlsbC1vcGFjaXR5PSIwLjMiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI0IiBmaWxsPSIjYTc4YmZhIi8+PC9zdmc+',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const currentLocationIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxOCIgY3k9IjE4IiByPSIxNiIgZmlsbD0iIzM3MzdiNiIvPjxjaXJjbGUgY3g9IjE4IiBjeT0iMTgiIHI9IjgiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-white/20">
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-[1000] space-y-2">
        <Button
          onClick={() => setShowDemandHotspots(!showDemandHotspots)}
          size="sm"
          className={`${showDemandHotspots ? 'bg-orange-600' : 'bg-white/10'} backdrop-blur-xl`}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Demand Hotspots
        </Button>
        <Button
          onClick={() => setShowOtherDrivers(!showOtherDrivers)}
          size="sm"
          className={`${showOtherDrivers ? 'bg-purple-600' : 'bg-white/10'} backdrop-blur-xl`}
        >
          <Users className="w-4 h-4 mr-2" />
          Other Drivers ({nearbyDrivers.length})
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-black/80 backdrop-blur-xl rounded-xl p-3 text-white text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span>Your Location</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span>Available Rides ({availableRides.length})</span>
        </div>
        {showOtherDrivers && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-400 rounded-full" />
            <span>Online Drivers ({nearbyDrivers.length})</span>
          </div>
        )}
        {showDemandHotspots && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full opacity-30" />
            <span>High Demand Areas</span>
          </div>
        )}
      </div>

      {/* Stats Overlay */}
      {demandInsights && (
        <div className="absolute top-4 right-4 z-[1000] bg-black/80 backdrop-blur-xl rounded-xl p-4 text-white space-y-2 max-w-xs">
          <div className="font-bold text-sm mb-2">Market Conditions</div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300">Current Demand</span>
            <Badge className={`${
              demandInsights.demand_forecast?.current_demand === 'high' ? 'bg-red-500' :
              demandInsights.demand_forecast?.current_demand === 'medium' ? 'bg-orange-500' :
              'bg-green-500'
            }`}>
              {demandInsights.demand_forecast?.current_demand}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300">Next Hour</span>
            <span className="text-yellow-400 font-semibold capitalize">
              {demandInsights.demand_forecast?.next_hour_prediction}
            </span>
          </div>
          {demandInsights.route_suggestions?.[0] && (
            <div className="pt-2 border-t border-white/20">
              <div className="text-xs text-gray-300 mb-1">Suggested Move:</div>
              <div className="flex items-start gap-2">
                <Navigation className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">{demandInsights.route_suggestions[0].destination}</div>
                  <div className="text-xs text-gray-400">{demandInsights.route_suggestions[0].reason}</div>
                  <div className="text-xs text-green-400 mt-1">
                    Est. {demandInsights.route_suggestions[0].estimated_rides_per_hour} rides/hr
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <MapUpdater center={mapCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Current Driver Location */}
        {driverLocation && (
          <Marker position={driverLocation} icon={currentLocationIcon}>
            <Popup>
              <div className="text-sm">
                <div className="font-bold mb-1">📍 Your Location</div>
                <div className="text-xs text-gray-600">
                  {driverLocation[0].toFixed(4)}, {driverLocation[1].toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Available Rides */}
        {availableRides.map((ride) => (
          <Marker
            key={ride.id}
            position={ride.pickup_coords}
            icon={rideIcon}
            eventHandlers={{
              click: () => setSelectedRide(ride)
            }}
          >
            <Popup>
              <div className="text-sm space-y-2 min-w-[200px]">
                <div className="font-bold text-green-600 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  ${(ride.fare_breakdown?.total_fare * 0.9 || 0).toFixed(2)} earnings
                </div>
                <div className="text-xs space-y-1">
                  <div><strong>From:</strong> {ride.pickup_address}</div>
                  <div><strong>To:</strong> {ride.dropoff_address}</div>
                  <div><strong>Type:</strong> {ride.ride_type}</div>
                  {ride.estimated_distance_miles && (
                    <div><strong>Distance:</strong> {ride.estimated_distance_miles} mi</div>
                  )}
                </div>
                {ride.ai_recommendation && (
                  <div className="pt-2 border-t border-gray-200">
                    <Badge className="bg-purple-500 text-white text-xs mb-1">
                      AI Score: {ride.ai_recommendation.score}/100
                    </Badge>
                    <div className="text-xs text-gray-600">
                      {ride.ai_recommendation.reasoning}
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Nearby Online Drivers */}
        {showOtherDrivers && nearbyDrivers.map((driver, idx) => (
          <Marker
            key={driver.id}
            position={[driver.driver_current_lat, driver.driver_current_lng]}
            icon={driverIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold mb-1">🚗 Driver Online</div>
                <div className="text-xs text-gray-600">
                  Nearby competitor
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Demand Hotspots */}
        {showDemandHotspots && demandInsights?.demand_forecast?.high_demand_areas?.map((area, idx) => (
          <Circle
            key={idx}
            center={[area.lat, area.lng]}
            radius={area.demand_level === 'high' ? 2000 : area.demand_level === 'medium' ? 1500 : 1000}
            pathOptions={{
              color: area.demand_level === 'high' ? '#f59e0b' : area.demand_level === 'medium' ? '#10b981' : '#3b82f6',
              fillColor: area.demand_level === 'high' ? '#f59e0b' : area.demand_level === 'medium' ? '#10b981' : '#3b82f6',
              fillOpacity: 0.15
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold mb-1">{area.area_name}</div>
                <div className="text-xs space-y-1">
                  <div><strong>Demand:</strong> <span className="capitalize">{area.demand_level}</span></div>
                  <div><strong>Distance:</strong> {area.distance_from_driver}</div>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Suggested Route to High Demand Area */}
        {showDemandHotspots && driverLocation && demandInsights?.route_suggestions?.[0] && (
          <Polyline
            positions={[
              driverLocation,
              demandInsights.demand_forecast.high_demand_areas[0] ? 
                [demandInsights.demand_forecast.high_demand_areas[0].lat, 
                 demandInsights.demand_forecast.high_demand_areas[0].lng] :
                driverLocation
            ]}
            pathOptions={{
              color: '#3b82f6',
              weight: 3,
              opacity: 0.6,
              dashArray: '10, 10'
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
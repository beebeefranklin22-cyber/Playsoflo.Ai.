import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import L from "leaflet";

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapController({ userLocation }) {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation) {
      map.setView(userLocation, 12);
    }
  }, [userLocation, map]);
  
  return null;
}

export default function TravelMap() {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  const { data: alerts = [] } = useQuery({
    queryKey: ["travel-alerts"],
    queryFn: () => base44.entities.TravelAlert.list(),
    initialData: []
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLocationError(null);
        },
        (error) => {
          console.error('Location error:', error);
          setLocationError(error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const center = userLocation || [25.7617, -80.1918]; // User location or Miami default

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 h-96">
      {locationError && (
        <div className="absolute top-2 left-2 z-[1000] bg-yellow-500/90 text-white px-3 py-2 rounded-lg text-sm">
          📍 Enable location for accurate map
        </div>
      )}
      <MapContainer 
        center={center} 
        zoom={userLocation ? 12 : 11} 
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <MapController userLocation={userLocation} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>
              <div className="font-semibold">📍 You are here</div>
            </Popup>
          </Marker>
        )}

        {/* Alert markers */}
        {alerts.filter(a => a.active).map((a) => (
          <Marker key={a.id} position={[a.lat, a.lng]}>
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold capitalize">{a.type.replace("_", " ")}</div>
                <div className="text-sm">{a.description}</div>
                <div className="text-xs text-gray-500">Severity: {a.severity}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
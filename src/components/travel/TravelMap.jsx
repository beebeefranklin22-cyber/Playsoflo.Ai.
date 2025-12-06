import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function TravelMap() {
  const { data: alerts = [] } = useQuery({
    queryKey: ["travel-alerts"],
    queryFn: () => base44.entities.TravelAlert.list(),
    initialData: []
  });

  const center = [25.7617, -80.1918]; // Miami default

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 h-96">
      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
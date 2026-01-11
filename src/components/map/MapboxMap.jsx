import React, { useEffect, useRef, useState } from "react";
import { Loader2, Navigation, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fallback to Leaflet (open source) if Mapbox not configured
export default function MapboxMap({ 
  center = [25.7617, -80.1918], // Miami [lat, lng]
  zoom = 12,
  markers = [],
  onMarkerClick,
  height = "500px",
  className = ""
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initMap = async () => {
      // Use Leaflet (already installed)
      const L = await import('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      
      if (!mapRef.current) return;

      // Load Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const map = L.map(mapRef.current).setView(center, zoom);

      // Add OpenStreetMap tiles (free, no API key needed)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add markers
      markers.forEach(markerData => {
        const marker = L.marker(markerData.position).addTo(map);
        
        if (markerData.title || markerData.info) {
          marker.bindPopup(`
            <div style="min-width: 200px;">
              <h3 style="font-weight: bold; margin-bottom: 4px;">${markerData.title}</h3>
              ${markerData.info ? `<p style="font-size: 14px;">${markerData.info}</p>` : ''}
            </div>
          `);
        }

        if (onMarkerClick) {
          marker.on('click', () => onMarkerClick(markerData));
        }
      });

      setLoading(false);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [center, zoom]);

  const recenter = () => {
    if (navigator.geolocation && mapInstanceRef.current) {
      navigator.geolocation.getCurrentPosition((position) => {
        mapInstanceRef.current.setView([position.coords.latitude, position.coords.longitude], 13);
      });
    }
  };

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div ref={mapRef} className="w-full h-full rounded-xl" />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm rounded-xl">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      )}

      <Button
        size="icon"
        onClick={recenter}
        className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-900"
      >
        <Navigation className="w-4 h-4" />
      </Button>
    </div>
  );
}
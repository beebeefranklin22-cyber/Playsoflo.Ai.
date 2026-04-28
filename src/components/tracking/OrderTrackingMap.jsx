import React, { useEffect, useRef } from "react";
import { MapPin, Clock, AlertCircle, Package } from "lucide-react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyB41DcZHwBpC6kv4QksFOJ-0E7MrhLPAEw";

export default function OrderTrackingMap({ order, driverLocation, estimatedArrival }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const destMarkerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Dynamically load Google Maps API
    if (!window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapRef.current) return;

      const center = driverLocation || {
        lat: 40.7128,
        lng: -74.0060
      };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: center,
        styles: [
          {
            elementType: "geometry",
            stylers: [{ color: "#242f3e" }]
          },
          {
            elementType: "labels.text.stroke",
            stylers: [{ color: "#242f3e" }]
          },
          {
            elementType: "labels.text.fill",
            stylers: [{ color: "#746855" }]
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }]
          }
        ]
      });

      // Driver marker
      if (driverLocation) {
        markerRef.current = new window.google.maps.Marker({
          position: driverLocation,
          map: mapInstanceRef.current,
          title: "Driver Location",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#9333ea",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2
          }
        });
      }

      // Destination marker
      if (order?.delivery_coords || order?.destination || order?.delivery_address) {
        const destCoords = order?.delivery_coords 
          ? { lat: order.delivery_coords[0], lng: order.delivery_coords[1] }
          : { lat: 40.7580, lng: -73.9855 };

        destMarkerRef.current = new window.google.maps.Marker({
          position: destCoords,
          map: mapInstanceRef.current,
          title: "Destination",
          icon: {
            path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 8,
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2
          }
        });

        // Fit both markers in view
        if (driverLocation && markerRef.current) {
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(driverLocation);
          bounds.extend(destCoords);
          mapInstanceRef.current.fitBounds(bounds, 100);
        }
      }
    }

    return () => {
      // Cleanup if needed
    };
  }, [driverLocation, order?.delivery_coords, order?.delivery_address]);

  return (
    <div className="w-full h-full bg-gray-900 rounded-2xl overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Info overlay */}
      <div className="absolute top-4 left-4 right-4 glass-effect rounded-xl p-3 backdrop-blur-lg border border-white/20 max-w-xs">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold line-clamp-1">
              {order?.delivery_address || order?.destination || "Destination"}
            </p>
            {estimatedArrival && (
              <div className="flex items-center gap-1 text-gray-300 text-xs mt-1">
                <Clock className="w-3 h-3" />
                {estimatedArrival}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
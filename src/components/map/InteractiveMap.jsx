import React, { useEffect, useRef, useState } from "react";
import { Loader2, Navigation, ZoomIn, ZoomOut, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InteractiveMap({ 
  center = { lat: 25.7617, lng: -80.1918 }, // Miami default
  zoom = 12,
  markers = [],
  onMarkerClick,
  onMapClick,
  showTraffic = false,
  showTransit = false,
  height = "500px",
  className = ""
}) {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('roadmap');

  useEffect(() => {
    const initMap = () => {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&libraries=places`;
        script.async = true;
        script.onload = createMap;
        document.head.appendChild(script);
      } else {
        createMap();
      }
    };

    const createMap = () => {
      if (!mapRef.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeId: mapType,
        styles: [
          {
            featureType: "all",
            elementType: "geometry",
            stylers: [{ color: "#242f3e" }]
          },
          {
            featureType: "all",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#242f3e" }]
          },
          {
            featureType: "all",
            elementType: "labels.text.fill",
            stylers: [{ color: "#746855" }]
          }
        ]
      });

      googleMapRef.current = map;

      // Add traffic layer
      if (showTraffic) {
        const trafficLayer = new window.google.maps.TrafficLayer();
        trafficLayer.setMap(map);
      }

      // Add transit layer
      if (showTransit) {
        const transitLayer = new window.google.maps.TransitLayer();
        transitLayer.setMap(map);
      }

      // Add markers
      updateMarkers(map);

      // Map click handler
      if (onMapClick) {
        map.addListener('click', (e) => {
          onMapClick({
            lat: e.latLng.lat(),
            lng: e.latLng.lng()
          });
        });
      }

      setLoading(false);
    };

    initMap();
  }, [center.lat, center.lng, zoom, showTraffic, showTransit, mapType]);

  const updateMarkers = (map) => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    markers.forEach(markerData => {
      const marker = new window.google.maps.Marker({
        position: markerData.position,
        map: map,
        title: markerData.title,
        icon: markerData.icon || undefined
      });

      if (markerData.info) {
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="color: black; padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${markerData.title}</h3>
            <p style="font-size: 14px;">${markerData.info}</p>
          </div>`
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
          if (onMarkerClick) onMarkerClick(markerData);
        });
      }

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (googleMapRef.current) {
      updateMarkers(googleMapRef.current);
    }
  }, [markers]);

  const recenterMap = () => {
    if (navigator.geolocation && googleMapRef.current) {
      navigator.geolocation.getCurrentPosition((position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        googleMapRef.current.setCenter(pos);
      });
    }
  };

  const zoomIn = () => {
    if (googleMapRef.current) {
      googleMapRef.current.setZoom(googleMapRef.current.getZoom() + 1);
    }
  };

  const zoomOut = () => {
    if (googleMapRef.current) {
      googleMapRef.current.setZoom(googleMapRef.current.getZoom() - 1);
    }
  };

  const toggleMapType = () => {
    const types = ['roadmap', 'satellite', 'hybrid', 'terrain'];
    const currentIndex = types.indexOf(mapType);
    const nextType = types[(currentIndex + 1) % types.length];
    setMapType(nextType);
    if (googleMapRef.current) {
      googleMapRef.current.setMapTypeId(nextType);
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

      {/* Map Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        <Button
          size="icon"
          onClick={recenterMap}
          className="bg-white/90 hover:bg-white text-gray-900"
        >
          <Navigation className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          onClick={zoomIn}
          className="bg-white/90 hover:bg-white text-gray-900"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          onClick={zoomOut}
          className="bg-white/90 hover:bg-white text-gray-900"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          onClick={toggleMapType}
          className="bg-white/90 hover:bg-white text-gray-900"
        >
          <Layers className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
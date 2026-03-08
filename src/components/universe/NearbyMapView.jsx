import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Navigation, Car, Briefcase, Calendar, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const MARKER_ICONS = {
  ride: { color: "#6366f1", label: "🚗" },
  service: { color: "#f59e0b", label: "🛠" },
  booking: { color: "#10b981", label: "📅" },
  user: { color: "#ec4899", label: "📍" },
};

export default function NearbyMapView({ onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [stats, setStats] = useState({ rides: 0, services: 0, bookings: 0 });
  const [filter, setFilter] = useState("all");
  const markersRef = useRef([]);

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
  };

  const addMarker = (map, position, icon, title, info) => {
    const marker = new window.google.maps.Marker({
      position,
      map,
      title,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: icon.color,
        fillOpacity: 0.9,
        strokeColor: "#fff",
        strokeWeight: 2,
      }
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `<div style="color:#111;font-family:sans-serif;padding:4px 8px;min-width:160px">
        <strong style="font-size:14px">${icon.label} ${title}</strong>
        <p style="margin:4px 0 0;font-size:12px;color:#555">${info}</p>
      </div>`
    });

    marker.addListener("click", () => infoWindow.open(map, marker));
    markersRef.current.push(marker);
    return marker;
  };

  const loadMapData = async (map, location, activeFilter) => {
    clearMarkers();

    // Add user location marker
    addMarker(map, location, MARKER_ICONS.user, "You are here", "Your current location");

    try {
      const [rides, services, bookings] = await Promise.all([
        base44.entities.RideRequest.filter({ status: "searching" }, "-created_date", 20),
        base44.entities.MarketplaceItem.filter({ availability: "available" }, "-created_date", 20),
        base44.entities.Booking.filter({ status: "confirmed" }, "-created_date", 20),
      ]);

      let rideCount = 0, serviceCount = 0, bookingCount = 0;

      if (activeFilter === "all" || activeFilter === "rides") {
        rides.forEach((ride, i) => {
          const offset = 0.01 * (Math.random() - 0.5) * 2;
          addMarker(
            map,
            { lat: location.lat + offset, lng: location.lng + offset * 1.2 },
            MARKER_ICONS.ride,
            `Ride Available`,
            ride.pickup_address || "Nearby pickup"
          );
          rideCount++;
        });
      }

      if (activeFilter === "all" || activeFilter === "services") {
        services.slice(0, 10).forEach((svc, i) => {
          const offset = 0.015 * (Math.random() - 0.5) * 2;
          addMarker(
            map,
            { lat: location.lat + offset, lng: location.lng + offset * 1.3 },
            MARKER_ICONS.service,
            svc.title || "Service",
            svc.category || "Available nearby"
          );
          serviceCount++;
        });
      }

      if (activeFilter === "all" || activeFilter === "bookings") {
        bookings.slice(0, 10).forEach((booking) => {
          const offset = 0.012 * (Math.random() - 0.5) * 2;
          addMarker(
            map,
            { lat: location.lat + offset, lng: location.lng + offset },
            MARKER_ICONS.booking,
            "Active Booking",
            booking.service_name || "Confirmed booking"
          );
          bookingCount++;
        });
      }

      setStats({ rides: rideCount, services: serviceCount, bookings: bookingCount });
    } catch (e) {
      console.error("Map data load error:", e);
    }
  };

  const initMap = (location) => {
    if (!window.google || !mapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: location,
      zoom: 14,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f2b4a" }] },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
      disableDefaultUI: true,
      zoomControl: true,
    });

    mapInstanceRef.current = map;
    loadMapData(map, location, filter);
    setLoading(false);
  };

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(loc);
            initMap(loc);
          },
          () => {
            // Default to Miami if denied
            const loc = { lat: 25.7617, lng: -80.1918 };
            setUserLocation(loc);
            initMap(loc);
          }
        );
        return;
      }

      const apiKey = GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      // Try to get it from the backend environment
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(loc);
            initMap(loc);
          },
          () => {
            const loc = { lat: 25.7617, lng: -80.1918 };
            setUserLocation(loc);
            initMap(loc);
          }
        );
      };
      script.onerror = () => setError("Failed to load Google Maps. Check your API key.");
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Re-render markers when filter changes
  useEffect(() => {
    if (mapInstanceRef.current && userLocation) {
      loadMapData(mapInstanceRef.current, userLocation, filter);
    }
  }, [filter]);

  const filters = [
    { id: "all", label: "All", icon: Navigation },
    { id: "rides", label: "Rides", icon: Car },
    { id: "services", label: "Services", icon: Briefcase },
    { id: "bookings", label: "Bookings", icon: Calendar },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-white/10 flex-shrink-0" style={{ paddingTop: 'max(0.75rem, var(--safe-area-top))' }}>
        <h2 className="text-white font-bold text-lg">Nearby</h2>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-3 px-4 py-2 bg-black/60 backdrop-blur-xl border-b border-white/10 flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-indigo-400 text-lg">🚗</span>
          <span className="text-white text-sm font-medium">{stats.rides} Rides</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-amber-400 text-lg">🛠</span>
          <span className="text-white text-sm font-medium">{stats.services} Services</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-emerald-400 text-lg">📅</span>
          <span className="text-white text-sm font-medium">{stats.bookings} Bookings</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 px-4 py-2 bg-black/40 border-b border-white/10 flex-shrink-0">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition flex-shrink-0 ${
              filter === f.id
                ? "bg-purple-600 text-white"
                : "bg-white/10 text-gray-300 hover:bg-white/20"
            }`}
          >
            <f.icon className="w-3.5 h-3.5" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-3" />
              <p className="text-white text-sm">Loading map...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center px-6">
              <p className="text-red-400 font-medium mb-2">Map Error</p>
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Legend */}
      <div className="flex gap-4 px-4 py-3 bg-black/80 backdrop-blur-xl border-t border-white/10 flex-shrink-0" style={{ paddingBottom: 'max(0.75rem, var(--safe-area-bottom))' }}>
        {[
          { color: "bg-indigo-500", label: "Ride" },
          { color: "bg-amber-500", label: "Service" },
          { color: "bg-emerald-500", label: "Booking" },
          { color: "bg-pink-500", label: "You" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full ${item.color}`} />
            <span className="text-gray-400 text-xs">{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
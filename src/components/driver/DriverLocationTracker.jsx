import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

export default function DriverLocationTracker({ isOnline, rideId }) {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isOnline) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    const updateLocation = async () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              await base44.auth.updateMe({
                driver_current_lat: position.coords.latitude,
                driver_current_lng: position.coords.longitude,
                driver_last_location_update: new Date().toISOString()
              });
            } catch (err) {
              console.error("Failed to update location:", err);
            }
          },
          (error) => {
            // Silently handle geolocation errors - user may have denied permission
            console.log("Geolocation not available or denied");
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      }
    };

    // Update immediately
    updateLocation();

    // Then update every 5 seconds
    intervalRef.current = setInterval(updateLocation, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOnline, rideId]);

  return null; // This is a utility component with no UI
}
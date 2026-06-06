import { useState, useEffect } from "react";

/**
 * Returns the user's current GPS coordinates and a distance calculator.
 */
export function useGeoDistance() {
  const [userCoords, setUserCoords] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  /**
   * Returns distance in miles between user and a point, or null if coords missing.
   */
  function distanceTo(lat2, lon2) {
    if (!userCoords || !lat2 || !lon2) return null;
    const R = 3958.8;
    const dLat = ((lat2 - userCoords.lat) * Math.PI) / 180;
    const dLon = ((lon2 - userCoords.lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((userCoords.lat * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  return { userCoords, distanceTo };
}
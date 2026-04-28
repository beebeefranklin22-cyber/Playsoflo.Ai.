import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Returns { userCity, userTimezone, refreshLocation }
 * Reads from authenticated user profile (user.city / user.timezone).
 */
export function useUserLocation() {
  const [userCity, setUserCity] = useState(null);
  const [userTimezone, setUserTimezone] = useState(null);

  const load = async () => {
    try {
      const user = await base44.auth.me();
      setUserCity(user?.city || null);
      setUserTimezone(user?.timezone || null);
    } catch {
      // not authenticated — silently ignore
    }
  };

  useEffect(() => { load(); }, []);

  return { userCity, userTimezone, refreshLocation: load };
}

/**
 * Filter an array of items by city string and optional radius (miles).
 * Items need a `location`, `service_area`, `venue_city`, or `venue_address` field.
 * If no city filter, returns all items.
 */
export function filterByLocation(items, cityFilter, radiusFilter) {
  if (!cityFilter && !radiusFilter) return items;
  if (!cityFilter) return items; // radius alone without city = no-op

  const q = cityFilter.toLowerCase().trim();
  return items.filter(item => {
    const haystack = [
      item.location,
      item.service_area,
      item.venue_city,
      item.venue_address,
      item.venue_state,
      item.pickup_location,
      item.city,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
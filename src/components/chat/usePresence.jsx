import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

export default function usePresence(currentUser) {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.email) return;

    const updatePresence = async () => {
      try {
        const existing = await base44.entities.UserPresence.filter({ 
          user_email: currentUser.email 
        });
        
        const presenceData = {
          status: 'online',
          last_seen: new Date().toISOString(),
          user_name: currentUser.full_name,
          user_photo: currentUser.profile_picture
        };

        if (existing.length > 0) {
          await base44.entities.UserPresence.update(existing[0].id, presenceData);
        } else {
          await base44.entities.UserPresence.create({
            user_email: currentUser.email,
            ...presenceData
          });
        }
      } catch (err) {
        // Silently fail - presence is not critical
      }
    };

    // Update immediately
    updatePresence();

    // Then update every 60 seconds (reduced frequency)
    intervalRef.current = setInterval(updatePresence, 60000);

    // Set offline on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Mark as offline
      base44.entities.UserPresence.filter({ user_email: currentUser.email })
        .then(existing => {
          if (existing.length > 0) {
            base44.entities.UserPresence.update(existing[0].id, { 
              status: 'offline',
              last_seen: new Date().toISOString()
            });
          }
        })
        .catch(() => {});
    };
  }, [currentUser?.email]);

  return null;
}
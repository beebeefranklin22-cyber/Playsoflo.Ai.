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
          user_name: currentUser.full_name || currentUser.email,
          user_photo: currentUser.profile_picture || currentUser.profile_photo
        };

        if (existing && existing.length > 0) {
          await base44.entities.UserPresence.update(existing[0].id, presenceData);
        } else {
          // Only try to create if we have a valid email
          if (currentUser.email) {
            await base44.entities.UserPresence.create({
              user_email: currentUser.email,
              ...presenceData
            });
          }
        }
      } catch (err) {
        // Silently ignore presence errors
        console.log('Presence update skipped');
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
      // Mark as offline - wrapped in try-catch to prevent errors during cleanup
      if (currentUser?.email) {
        base44.entities.UserPresence.filter({ user_email: currentUser.email })
          .then(existing => {
            if (existing && existing.length > 0) {
              base44.entities.UserPresence.update(existing[0].id, { 
                status: 'offline',
                last_seen: new Date().toISOString()
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }
    };
  }, [currentUser?.email]);

  return null;
}
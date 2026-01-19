import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function RideNotificationHandler({ currentUser }) {
  const queryClient = useQueryClient();

  // Subscribe to ride updates for current user
  useEffect(() => {
    if (!currentUser?.email) return;

    const unsubscribe = base44.entities.RideRequest.subscribe((event) => {
      // Only handle updates for rides where user is the passenger or driver
      const isPassenger = event.data?.created_by === currentUser.email;
      const isDriver = event.data?.driver_email === currentUser.email;
      
      if (isPassenger) {
        const ride = event.data;
        
        // Show toast for important status changes
        if (event.type === 'update') {
          // Driver assigned
          if (ride.status === 'en_route' && ride.driver_email) {
            toast.success('Driver assigned!', {
              description: 'Your driver is on the way',
              duration: 5000,
            });
          }
          
          // Driver arrived
          if (ride.status === 'arrived') {
            toast.success('Driver has arrived!', {
              description: 'Please come out to your vehicle',
              duration: 7000,
            });
            
            // Play notification sound
            if ('Audio' in window) {
              try {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(() => {});
              } catch (err) {}
            }
            
            // Vibrate if supported
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
          }
          
          // Ride started
          if (ride.status === 'in_progress') {
            toast.info('Ride started', {
              description: 'On your way to destination',
              duration: 4000,
            });
          }
          
          // Ride completed
          if (ride.status === 'completed') {
            toast.success('Ride completed!', {
              description: 'Please rate your driver',
              duration: 6000,
            });
          }
        }
        
        // Invalidate only specific queries, not all
        queryClient.invalidateQueries({ queryKey: ['ride-tracking', ride.id] });
      } else if (isDriver) {
        // Only refresh driver queries if this is a driver
        queryClient.invalidateQueries({ queryKey: ['driver-active-rides'] });
        queryClient.invalidateQueries({ queryKey: ['pending-ride-requests'] });
      }
    });

    return () => unsubscribe();
  }, [currentUser?.email, queryClient]);

  return null;
}
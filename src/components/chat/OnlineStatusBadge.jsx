import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function OnlineStatusBadge({ userEmail, size = "sm" }) {
  const { data: presence } = useQuery({
    queryKey: ['user-presence', userEmail],
    queryFn: async () => {
      const presences = await base44.entities.UserPresence.filter({ 
        user_email: userEmail 
      });
      return presences[0] || null;
    },
    enabled: !!userEmail,
    refetchInterval: 10000 // Check every 10 seconds
  });

  const getStatus = () => {
    if (!presence) return 'offline';
    if (presence.status === 'online' && presence.last_seen) {
      const lastSeen = new Date(presence.last_seen);
      const diff = new Date() - lastSeen;
      if (diff < 60000) return 'online';
      if (diff < 300000) return 'away';
    }
    return 'offline';
  };

  const status = getStatus();
  
  const sizeClasses = {
    xs: "w-2 h-2",
    sm: "w-3 h-3",
    md: "w-4 h-4"
  };

  const colorClasses = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    offline: "bg-gray-500"
  };

  return (
    <div 
      className={`${sizeClasses[size]} ${colorClasses[status]} rounded-full border-2 border-gray-900`}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  );
}
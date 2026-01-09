import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";

export default function NotificationBadge({ currentUser, className = "" }) {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return 0;
      const notifications = await base44.entities.Notification.filter({ 
        user_email: currentUser.email,
        read: false 
      });
      return notifications.length;
    },
    enabled: !!currentUser,
    refetchInterval: 5000,
    initialData: 0
  });

  if (unreadCount === 0) return null;

  return (
    <Badge className={`bg-red-500 ${className}`}>
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
}
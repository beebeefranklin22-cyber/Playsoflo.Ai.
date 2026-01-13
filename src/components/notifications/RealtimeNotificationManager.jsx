import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Bell, Calendar, MessageCircle, DollarSign, XCircle, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const notificationIcons = {
  booking_confirmed: CheckCircle,
  booking_cancelled: XCircle,
  booking_reminder: Calendar,
  new_booking: Calendar,
  payment_received: DollarSign,
  payment_completed: CheckCircle,
  new_message: MessageCircle,
  booking_updated: AlertCircle,
  default: Bell
};

const notificationColors = {
  booking_confirmed: "text-green-400",
  booking_cancelled: "text-red-400",
  booking_reminder: "text-blue-400",
  new_booking: "text-purple-400",
  payment_received: "text-green-400",
  payment_completed: "text-green-400",
  new_message: "text-blue-400",
  booking_updated: "text-yellow-400",
  default: "text-gray-400"
};

export default function RealtimeNotificationManager({ currentUser }) {
  const [notificationSound] = useState(new Audio('/notification.mp3'));
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser?.email) return;

    console.log('🔔 Starting real-time notifications for:', currentUser.email);

    // Subscribe to new notifications for this user
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create') {
        const notification = event.data;
        
        // Only show if it's for the current user
        if (notification.recipient_email === currentUser.email) {
          showNotificationToast(notification);
          
          // Play notification sound
          try {
            notificationSound.play().catch(() => {
              // Ignore errors if sound fails
            });
          } catch (e) {
            // Ignore sound errors
          }
        }
      }
    });

    return () => {
      console.log('🔕 Stopping real-time notifications');
      unsubscribe();
    };
  }, [currentUser?.email]);

  const showNotificationToast = (notification) => {
    const Icon = notificationIcons[notification.type] || notificationIcons.default;
    const color = notificationColors[notification.type] || notificationColors.default;

    toast(
      <div 
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => handleNotificationClick(notification)}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
        <div className="flex-1">
          <p className="font-semibold text-white text-sm">{notification.title}</p>
          <p className="text-gray-300 text-xs mt-1">{notification.message}</p>
        </div>
      </div>,
      {
        duration: 5000,
        position: 'top-right',
        style: {
          background: 'rgba(30, 41, 59, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
        }
      }
    );
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    try {
      await base44.entities.Notification.update(notification.id, { read: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }

    // Navigate based on notification type
    if (notification.action_url) {
      navigate(notification.action_url);
    } else if (notification.reference_type === 'booking') {
      navigate(createPageUrl('CustomerBookings'));
    } else if (notification.reference_type === 'message') {
      navigate(createPageUrl('Messages'));
    } else if (notification.reference_type === 'payment') {
      navigate(createPageUrl('Wallet'));
    }
  };

  return null; // This is a headless component
}
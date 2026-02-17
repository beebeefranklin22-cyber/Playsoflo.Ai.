import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Bell, Calendar, MessageCircle, DollarSign, XCircle, CheckCircle, AlertCircle, UserPlus, Package, Car } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const notificationIcons = {
  booking_confirmed: CheckCircle,
  booking_cancelled: XCircle,
  booking_reminder: Calendar,
  booking_rescheduled: Calendar,
  new_booking: Calendar,
  booking_pending: AlertCircle,
  booking_completed: CheckCircle,
  payment_received: DollarSign,
  payment_completed: CheckCircle,
  new_message: MessageCircle,
  booking_updated: AlertCircle,
  order_update: Package,
  ride_update: Car,
  default: Bell
};

const notificationColors = {
  booking_confirmed: "text-green-400",
  booking_cancelled: "text-red-400",
  booking_reminder: "text-blue-400",
  booking_rescheduled: "text-yellow-400",
  booking_pending: "text-orange-400",
  booking_completed: "text-green-400",
  new_booking: "text-purple-400",
  payment_received: "text-green-400",
  payment_completed: "text-green-400",
  new_message: "text-blue-400",
  booking_updated: "text-yellow-400",
  order_update: "text-blue-400",
  ride_update: "text-cyan-400",
  default: "text-gray-400"
};

export default function RealtimeNotificationManager({ currentUser }) {
  const [notificationSound] = useState(new Audio('/notification.mp3'));
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

          // Trigger haptic feedback for important notifications
          if (window.NativeAppBridge?.triggerHaptic) {
            const importantTypes = ['booking_confirmed', 'booking_cancelled', 'payment_received', 'ride_update'];
            if (importantTypes.includes(notification.type)) {
              window.NativeAppBridge.triggerHaptic('medium');
            } else {
              window.NativeAppBridge.triggerHaptic('light');
            }
          }

          // Send native push notification if available
          if ('serviceWorker' in navigator && 'PushManager' in window) {
            sendPushNotification(notification);
          }
        }
      }
    });

    return () => {
      console.log('🔕 Stopping real-time notifications');
      unsubscribe();
    };
  }, [currentUser?.email]);

  const handleFollowAction = async (requestId, action, notificationId) => {
    try {
      await base44.entities.FollowRequest.update(requestId, { status: action });
      await base44.entities.Notification.update(notificationId, { read: true });
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unread-notifications']);
      toast.success(action === 'accepted' ? 'Follow request accepted!' : 'Follow request declined');
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleRideAction = async (rideId, action, notificationId) => {
    try {
      const status = action === 'accept' ? 'accepted' : 'declined_by_customer';
      await base44.entities.RideRequest.update(rideId, { 
        driver_status: action === 'accept' ? 'accepted' : 'declined',
        status 
      });
      await base44.entities.Notification.update(notificationId, { read: true });
      queryClient.invalidateQueries(['notifications']);
      toast.success(action === 'accept' ? 'Ride accepted!' : 'Ride declined');
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const sendPushNotification = async (notification) => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const notif = new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192.png',
          badge: '/icon-72.png',
          tag: notification.id,
          requireInteraction: ['booking_confirmed', 'booking_cancelled', 'payment_received'].includes(notification.type),
          data: {
            url: notification.action_url || '/notifications'
          }
        });

        notif.onclick = () => {
          window.focus();
          if (notification.action_url) {
            navigate(notification.action_url);
          }
          notif.close();
        };
      }
    } catch (error) {
      console.log('Push notification failed:', error);
    }
  };

  const showNotificationToast = (notification) => {
    const Icon = notificationIcons[notification.type] || notificationIcons.default;
    const color = notificationColors[notification.type] || notificationColors.default;
    const metadata = notification.metadata || {};

    // Determine if this notification has actions
    const hasActions = metadata.follow_request_id || metadata.ride_id || metadata.order_id || metadata.booking_id;

    toast(
      <div className="flex flex-col gap-2">
        <div 
          className="flex items-start gap-3 cursor-pointer"
          onClick={() => !hasActions && handleNotificationClick(notification)}
        >
          <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
          <div className="flex-1">
            <p className="font-semibold text-white text-sm">{notification.title}</p>
            <p className="text-gray-300 text-xs mt-1">{notification.message}</p>
          </div>
        </div>
        
        {/* Follow Request Actions */}
        {metadata.follow_request_id && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleFollowAction(metadata.follow_request_id, 'accepted', notification.id)}
              className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition"
            >
              Accept
            </button>
            <button
              onClick={() => handleFollowAction(metadata.follow_request_id, 'declined', notification.id)}
              className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition"
            >
              Decline
            </button>
          </div>
        )}

        {/* Ride Request Actions */}
        {metadata.ride_id && notification.type === 'ride_request' && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleRideAction(metadata.ride_id, 'accept', notification.id)}
              className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition"
            >
              Accept Ride
            </button>
            <button
              onClick={() => handleRideAction(metadata.ride_id, 'decline', notification.id)}
              className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition"
            >
              Decline
            </button>
          </div>
        )}

        {/* Order View Action */}
        {metadata.order_id && (
          <button
            onClick={() => {
              navigate(createPageUrl('FoodOrderTracking'));
              base44.entities.Notification.update(notification.id, { read: true });
            }}
            className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition mt-2"
          >
            View Order
          </button>
        )}

        {/* Booking View Action */}
        {metadata.booking_id && (
          <button
            onClick={() => {
              navigate(createPageUrl('CustomerBookings') + `?booking=${metadata.booking_id}`);
              base44.entities.Notification.update(notification.id, { read: true });
            }}
            className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition mt-2"
          >
            View Booking
          </button>
        )}

        {/* Message Reply Action */}
        {(metadata.sender_email || notification.type === 'new_message' || notification.type === 'message' || notification.type === 'direct_message') && (
          <button
            onClick={() => {
              const chatId = metadata.conversation_id || metadata.sender_email || notification.sender_email;
              navigate(createPageUrl('Messages') + (chatId ? `?chat=${chatId}` : ''));
              base44.entities.Notification.update(notification.id, { read: true });
            }}
            className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition mt-2"
          >
            Reply
          </button>
        )}
      </div>,
      {
        duration: hasActions ? 10000 : 5000,
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
      const bookingId = notification.reference_id || notification.metadata?.booking_id;
      navigate(createPageUrl('CustomerBookings') + (bookingId ? `?booking=${bookingId}` : ''));
    } else if (notification.reference_type === 'message' || notification.reference_type === 'direct_message') {
      const convId = notification.reference_id || notification.metadata?.conversation_id;
      navigate(createPageUrl('Messages') + (convId ? `?conv=${convId}` : ''));
    } else if (notification.reference_type === 'payment') {
      navigate(createPageUrl('Wallet'));
    } else if (notification.reference_type === 'order') {
      navigate(createPageUrl('FoodOrderTracking'));
    }
  };

  return null; // This is a headless component
}
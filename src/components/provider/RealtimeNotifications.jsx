import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Calendar, MessageCircle, FileText, DollarSign, Star, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function RealtimeNotifications({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    // Load notification preferences
    const loadPreferences = async () => {
      try {
        const prefs = await base44.entities.NotificationPreferences.filter({
          user_email: currentUser.email
        });
        setPreferences(prefs[0] || null);
      } catch (err) {
        console.error('Failed to load preferences:', err);
      }
    };
    loadPreferences();

    // Subscribe to booking updates
    const bookingUnsub = base44.entities.ServiceBooking.subscribe((event) => {
      if (event.data.provider_email !== currentUser.email) return;

      if (event.type === 'create' && preferences?.new_booking_app !== false) {
        const notif = {
          id: Date.now(),
          type: 'booking',
          icon: Calendar,
          color: 'text-green-400',
          title: 'New Booking!',
          message: `${event.data.customer_email} booked ${event.data.service_title}`,
          timestamp: new Date(),
          data: event.data
        };
        setNotifications(prev => [notif, ...prev].slice(0, 5));
        toast.success('New booking received!');
      }

      if (event.type === 'update' && event.data.status === 'cancelled' && preferences?.booking_cancellation_app !== false) {
        const notif = {
          id: Date.now(),
          type: 'cancellation',
          icon: AlertTriangle,
          color: 'text-red-400',
          title: 'Booking Cancelled',
          message: `Booking for ${event.data.service_title} was cancelled`,
          timestamp: new Date(),
          data: event.data
        };
        setNotifications(prev => [notif, ...prev].slice(0, 5));
        toast.error('A booking was cancelled');
      }
    });

    // Subscribe to message updates
    const messageUnsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.type !== 'create') return;

      // Check if message is in a conversation where user is a participant
      const checkAndNotify = async () => {
        try {
          const conversation = await base44.entities.ChatConversation.filter({
            id: event.data.conversation_id
          });
          if (conversation[0]?.participants?.includes(currentUser.email) && 
              event.data.sender_email !== currentUser.email &&
              preferences?.new_message_app !== false) {
            const notif = {
              id: Date.now(),
              type: 'message',
              icon: MessageCircle,
              color: 'text-blue-400',
              title: 'New Message',
              message: `${event.data.sender_email}: ${event.data.content.substring(0, 50)}...`,
              timestamp: new Date(),
              data: event.data
            };
            setNotifications(prev => [notif, ...prev].slice(0, 5));
            toast('New message received');
          }
        } catch (err) {
          console.error('Failed to check conversation:', err);
        }
      };
      checkAndNotify();
    });

    // Subscribe to contract signing
    const contractUnsub = base44.entities.ServiceAgreement.subscribe((event) => {
      if (event.type === 'create' && event.data.provider_email === currentUser.email && preferences?.contract_signing_app !== false) {
        const notif = {
          id: Date.now(),
          type: 'contract',
          icon: FileText,
          color: 'text-purple-400',
          title: 'Contract Signed',
          message: `${event.data.customer_name} signed the service agreement`,
          timestamp: new Date(),
          data: event.data
        };
        setNotifications(prev => [notif, ...prev].slice(0, 5));
        toast.success('Service agreement signed!');
      }
    });

    // Subscribe to payment updates
    const paymentUnsub = base44.entities.Payment.subscribe((event) => {
      if (event.type === 'create' && event.data.recipient_email === currentUser.email && preferences?.payment_received_app !== false) {
        const notif = {
          id: Date.now(),
          type: 'payment',
          icon: DollarSign,
          color: 'text-yellow-400',
          title: 'Payment Received',
          message: `Received $${event.data.amount_usd} from ${event.data.sender_email}`,
          timestamp: new Date(),
          data: event.data
        };
        setNotifications(prev => [notif, ...prev].slice(0, 5));
        toast.success(`Payment received: $${event.data.amount_usd}`);
      }
    });

    // Subscribe to reviews
    const reviewUnsub = base44.entities.UserReview.subscribe((event) => {
      if (event.type === 'create' && event.data.provider_email === currentUser.email && preferences?.review_posted_app !== false) {
        const notif = {
          id: Date.now(),
          type: 'review',
          icon: Star,
          color: 'text-pink-400',
          title: 'New Review',
          message: `${event.data.reviewer_name} left a ${event.data.rating}-star review`,
          timestamp: new Date(),
          data: event.data
        };
        setNotifications(prev => [notif, ...prev].slice(0, 5));
        toast('New review posted');
      }
    });

    return () => {
      bookingUnsub();
      messageUnsub();
      contractUnsub();
      paymentUnsub();
      reviewUnsub();
    };
  }, [currentUser, preferences]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)]">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className="mb-3"
          >
            <div className="bg-gray-900 border border-white/20 rounded-xl p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <div className={`p-2 bg-white/10 rounded-lg ${notif.color}`}>
                  <notif.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-white font-semibold text-sm">{notif.title}</h4>
                    <button
                      onClick={() => removeNotification(notif.id)}
                      className="text-gray-400 hover:text-white transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-gray-300 text-sm line-clamp-2">{notif.message}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {notif.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
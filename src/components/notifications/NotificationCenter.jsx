import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, Check, Trash2, Settings, Car, Home, DollarSign,
  MessageCircle, Heart, AlertCircle, Sparkles, Filter, X, Star, Package, UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import UniversalReviewModal from "../reviews/UniversalReviewModal";

const notificationIcons = {
  'ride_request': Car,
  'ride_update': Car,
  'booking_request': Home,
  'booking_update': Home,
  'settlement': AlertCircle,
  'message': MessageCircle,
  'social': Heart,
  'payment': DollarSign,
  'system': Bell,
  'new_listing': Sparkles,
  'default': Bell
};

export default function NotificationCenter({ currentUser, compact = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [showReviewModal, setShowReviewModal] = useState(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', currentUser?.email, filter],
    queryFn: async () => {
      if (!currentUser) return [];
      const query = filter === 'unread' 
        ? { recipient_email: currentUser.email, read: false }
        : { recipient_email: currentUser.email };
      return await base44.entities.Notification.filter(query, '-created_date', 50);
    },
    enabled: !!currentUser,
    refetchInterval: 10000,
    initialData: []
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unread-notifications']);
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => 
        base44.entities.Notification.update(n.id, { read: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unread-notifications']);
      toast.success('All notifications marked as read');
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unread-notifications']);
      toast.success('Notification deleted');
    }
  });

  const handleFollowAction = useMutation({
    mutationFn: async ({ requestId, action, notificationId }) => {
      await base44.entities.FollowRequest.update(requestId, { status: action });
      await base44.entities.Notification.update(notificationId, { read: true });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['unread-notifications']);
      toast.success(action === 'accepted' ? 'Follow request accepted!' : 'Follow request declined');
    }
  });

  const handleRideAction = useMutation({
    mutationFn: async ({ rideId, action, notificationId }) => {
      const status = action === 'accept' ? 'accepted' : 'declined_by_customer';
      await base44.entities.RideRequest.update(rideId, { 
        driver_status: action === 'accept' ? 'accepted' : 'declined',
        status 
      });
      await base44.entities.Notification.update(notificationId, { read: true });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries(['notifications']);
      toast.success(action === 'accept' ? 'Ride accepted!' : 'Ride declined');
    }
  });

  const handleBookingAction = useMutation({
    mutationFn: async ({ bookingId, action, notificationId }) => {
      await base44.entities.Booking.update(bookingId, { 
        status: action === 'accept' ? 'confirmed' : 'cancelled'
      });
      await base44.entities.Notification.update(notificationId, { read: true });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries(['notifications']);
      toast.success(action === 'accept' ? 'Booking confirmed!' : 'Booking declined');
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const groupedNotifications = notifications.reduce((acc, notif) => {
    const today = new Date().toDateString();
    const notifDate = new Date(notif.created_date).toDateString();
    const key = notifDate === today ? 'Today' : 
                notifDate === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' : 
                'Earlier';
    if (!acc[key]) acc[key] = [];
    acc[key].push(notif);
    return acc;
  }, {});

  const handleNotificationClick = (notification) => {
    markAsReadMutation.mutate(notification.id);

    // Navigate based on notification type
    const metadata = notification.metadata || {};
    
    // Check if this is a review prompt
    if (metadata.action === 'review') {
      setShowReviewModal(notification);
      return;
    }
    
    if (notification.type === 'ride_request' || notification.type === 'ride_update') {
      navigate(createPageUrl('DriverHub'));
    } else if (notification.type === 'booking_request' || notification.type === 'booking_update') {
      navigate(createPageUrl('ProviderHub'));
    } else if (notification.type === 'settlement') {
      navigate(createPageUrl('CarRentals'));
    } else if (notification.type === 'message') {
      navigate(createPageUrl('Messages'));
    } else if (notification.type === 'social') {
      navigate(createPageUrl('Profile'));
    } else if (notification.type === 'payment') {
      navigate(createPageUrl('Wallet'));
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {notifications.slice(0, 5).map((notif) => {
          const Icon = notificationIcons[notif.type] || notificationIcons.default;
          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3 rounded-xl cursor-pointer transition ${
                notif.read ? 'bg-white/5' : 'bg-purple-500/10 border border-purple-500/30'
              } hover:bg-white/10`}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{notif.title}</p>
                  <p className="text-gray-400 text-xs line-clamp-1">{notif.message}</p>
                </div>
                {!notif.read && <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1" />}
              </div>
            </motion.div>
          );
        })}
        {notifications.length > 5 && (
          <Button
            onClick={() => navigate(createPageUrl('Notifications'))}
            variant="ghost"
            className="w-full text-purple-400 hover:text-purple-300"
          >
            View All Notifications
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      {showReviewModal && (
        <UniversalReviewModal
          reviewedUserEmail={showReviewModal.metadata.driver_email || showReviewModal.metadata.provider_email || showReviewModal.metadata.host_email || showReviewModal.metadata.owner_email}
          reviewedUserName="Provider"
          reviewType={showReviewModal.metadata.ride_id ? 'driver' : showReviewModal.metadata.property_id ? 'property' : 'service'}
          bookingId={showReviewModal.metadata.booking_id || showReviewModal.metadata.rental_id || showReviewModal.metadata.ride_id}
          propertyId={showReviewModal.metadata.property_id}
          onClose={() => setShowReviewModal(null)}
          onSuccess={() => {
            deleteNotificationMutation.mutate(showReviewModal.id);
          }}
        />
      )}
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">Notifications</h2>
          {unreadCount > 0 && (
            <Badge className="bg-purple-500">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate(createPageUrl('NotificationPreferences'))}
            variant="outline"
            size="sm"
            className="bg-white/5 border-white/20"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={setFilter} className="space-y-4">
        <TabsList className="bg-white/10 border border-white/20">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : notifications.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-12 text-center">
                <Bell className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">All caught up!</h3>
                <p className="text-gray-400">No notifications to show</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedNotifications).map(([group, notifs]) => (
                <div key={group}>
                  <h3 className="text-gray-400 text-sm font-semibold mb-3">{group}</h3>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {notifs.map((notif) => {
                        const Icon = notificationIcons[notif.type] || notificationIcons.default;
                        return (
                          <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            layout
                          >
                            <Card className={`${
                              notif.read 
                                ? 'bg-white/5 border-white/10' 
                                : 'bg-purple-500/10 border-purple-500/30'
                            } hover:bg-white/10 transition cursor-pointer`}>
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    notif.read ? 'bg-white/10' : 'bg-purple-500/20'
                                  }`}>
                                    <Icon className="w-5 h-5 text-purple-400" />
                                  </div>
                                  
                                  <div 
                                    className="flex-1 min-w-0"
                                    onClick={() => handleNotificationClick(notif)}
                                  >
                                    <div className="flex items-start justify-between gap-3 mb-1">
                                      <h4 className="text-white font-semibold">{notif.title}</h4>
                                      {!notif.read && (
                                        <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1" />
                                      )}
                                    </div>
                                    <p className="text-gray-300 text-sm mb-2">{notif.message}</p>
                                    
                                    {/* Action Buttons */}
                                    {notif.metadata?.follow_request_id && (
                                      <div className="flex gap-2 mb-3">
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleFollowAction.mutate({ 
                                              requestId: notif.metadata.follow_request_id, 
                                              action: 'accepted',
                                              notificationId: notif.id 
                                            });
                                          }}
                                          disabled={handleFollowAction.isPending}
                                          size="sm"
                                          className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                          <Check className="w-3 h-3 mr-1" />
                                          Accept
                                        </Button>
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleFollowAction.mutate({ 
                                              requestId: notif.metadata.follow_request_id, 
                                              action: 'declined',
                                              notificationId: notif.id 
                                            });
                                          }}
                                          disabled={handleFollowAction.isPending}
                                          size="sm"
                                          className="flex-1 bg-red-600 hover:bg-red-700"
                                        >
                                          <X className="w-3 h-3 mr-1" />
                                          Decline
                                        </Button>
                                      </div>
                                    )}

                                    {notif.metadata?.ride_id && notif.type === 'ride_request' && (
                                      <div className="flex gap-2 mb-3">
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRideAction.mutate({ 
                                              rideId: notif.metadata.ride_id, 
                                              action: 'accept',
                                              notificationId: notif.id 
                                            });
                                          }}
                                          disabled={handleRideAction.isPending}
                                          size="sm"
                                          className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                          <Car className="w-3 h-3 mr-1" />
                                          Accept Ride
                                        </Button>
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRideAction.mutate({ 
                                              rideId: notif.metadata.ride_id, 
                                              action: 'decline',
                                              notificationId: notif.id 
                                            });
                                          }}
                                          disabled={handleRideAction.isPending}
                                          size="sm"
                                          className="flex-1 bg-red-600 hover:bg-red-700"
                                        >
                                          <X className="w-3 h-3 mr-1" />
                                          Decline
                                        </Button>
                                      </div>
                                    )}

                                    {notif.metadata?.booking_id && notif.type === 'booking_request' && (
                                      <div className="flex gap-2 mb-3">
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBookingAction.mutate({ 
                                              bookingId: notif.metadata.booking_id, 
                                              action: 'accept',
                                              notificationId: notif.id 
                                            });
                                          }}
                                          disabled={handleBookingAction.isPending}
                                          size="sm"
                                          className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                          <Check className="w-3 h-3 mr-1" />
                                          Confirm
                                        </Button>
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBookingAction.mutate({ 
                                              bookingId: notif.metadata.booking_id, 
                                              action: 'decline',
                                              notificationId: notif.id 
                                            });
                                          }}
                                          disabled={handleBookingAction.isPending}
                                          size="sm"
                                          className="flex-1 bg-red-600 hover:bg-red-700"
                                        >
                                          <X className="w-3 h-3 mr-1" />
                                          Decline
                                        </Button>
                                      </div>
                                    )}

                                    {notif.metadata?.order_id && (
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsReadMutation.mutate(notif.id);
                                          navigate(createPageUrl('FoodOrderTracking'));
                                        }}
                                        size="sm"
                                        className="w-full mb-3 bg-blue-600 hover:bg-blue-700"
                                      >
                                        <Package className="w-3 h-3 mr-1" />
                                        View Order
                                      </Button>
                                    )}

                                    {(notif.metadata?.sender_email || notif.type === 'message' || notif.type === 'new_message' || notif.type === 'direct_message') && (
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsReadMutation.mutate(notif.id);
                                          const chatId = notif.metadata?.conversation_id || notif.metadata?.sender_email || notif.sender_email;
                                          navigate(createPageUrl('Messages') + (chatId ? `?chat=${chatId}` : ''));
                                        }}
                                        size="sm"
                                        className="w-full mb-3 bg-purple-600 hover:bg-purple-700"
                                      >
                                        <MessageCircle className="w-3 h-3 mr-1" />
                                        Reply
                                      </Button>
                                    )}

                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-500 text-xs">
                                        {new Date(notif.created_date).toLocaleString()}
                                      </span>
                                      <div className="flex gap-2">
                                        {notif.metadata?.action === 'review' && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleNotificationClick(notif);
                                            }}
                                            className="text-yellow-400 hover:text-yellow-300 text-xs flex items-center gap-1 font-semibold"
                                          >
                                            <Star className="w-3 h-3" />
                                            Leave Review
                                          </button>
                                        )}
                                        {!notif.read && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              markAsReadMutation.mutate(notif.id);
                                            }}
                                            className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1"
                                          >
                                            <Check className="w-3 h-3" />
                                            Mark read
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotificationMutation.mutate(notif.id);
                                          }}
                                          className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
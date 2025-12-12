import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, CheckCircle, Package, Heart, MessageCircle, 
  AlertCircle, DollarSign, Users, Trash2, Settings,
  Mail, Smartphone, Filter, UserPlus, Music
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LoadMoreButton } from "../components/Pagination";
import { toast } from "sonner";

const notificationIcons = {
  booking_confirmed: CheckCircle,
  payment_received: DollarSign,
  order_update: Package,
  new_follower: Users,
  follow_request: UserPlus,
  new_message: MessageCircle,
  chat_message: MessageCircle,
  direct_message: MessageCircle,
  dispute_opened: AlertCircle,
  dispute_resolved: CheckCircle,
  tip_received: Heart,
  escrow_released: DollarSign,
  system_alert: Bell,
  new_comment: MessageCircle,
  comment_reply: MessageCircle,
  comment_like: Heart,
  post_like: Heart,
  new_post: Bell,
  friend_listening: Music,
  booking_update: Package,
  important_update: AlertCircle
};

const notificationColors = {
  booking_confirmed: "text-green-400",
  payment_received: "text-green-400",
  order_update: "text-blue-400",
  new_follower: "text-purple-400",
  follow_request: "text-purple-400",
  new_message: "text-cyan-400",
  chat_message: "text-cyan-400",
  direct_message: "text-cyan-400",
  dispute_opened: "text-red-400",
  dispute_resolved: "text-green-400",
  tip_received: "text-pink-400",
  escrow_released: "text-yellow-400",
  system_alert: "text-orange-400",
  new_comment: "text-cyan-400",
  comment_reply: "text-blue-400",
  comment_like: "text-pink-400",
  post_like: "text-pink-400",
  new_post: "text-purple-400",
  friend_listening: "text-green-400",
  booking_update: "text-blue-400",
  important_update: "text-red-400"
};

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const itemsPerPage = 20;

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allNotifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date'),
    refetchInterval: 30000, // Refresh every 30 seconds
    initialData: []
  });

  const { data: preferences, isLoading: loadingPrefs } = useQuery({
    queryKey: ['notification-preferences', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;
      const prefs = await base44.entities.NotificationPreferences.filter({ 
        user_email: currentUser.email 
      });
      return prefs[0] || null;
    },
    enabled: !!currentUser
  });

  // Filter notifications by type
  const filteredNotifications = filterType === "all" 
    ? allNotifications 
    : allNotifications.filter(n => {
        if (filterType === "unread") return !n.read;
        if (filterType === "social") return ["post_like", "new_comment", "comment_reply", "new_follower", "follow_request", "friend_listening"].includes(n.type);
        if (filterType === "messages") return ["new_message", "chat_message", "direct_message"].includes(n.type);
        if (filterType === "payments") return ["payment_received", "tip_received", "booking_confirmed"].includes(n.type);
        if (filterType === "bookings") return ["booking_confirmed", "booking_update", "order_update"].includes(n.type);
        return true;
      });

  const notifications = filteredNotifications.slice(0, page * itemsPerPage);

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      toast.success("Notification deleted");
    }
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates) => {
      if (!currentUser) return;
      
      if (preferences) {
        return await base44.entities.NotificationPreferences.update(preferences.id, updates);
      } else {
        return await base44.entities.NotificationPreferences.create({
          user_email: currentUser.email,
          ...updates
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success("Preferences updated");
    }
  });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const unreadCount = allNotifications.filter(n => !n.read).length;

  const togglePushNotification = (type) => {
    const currentPrefs = preferences || { push_notifications: {}, email_notifications: {} };
    updatePreferencesMutation.mutate({
      push_notifications: {
        ...currentPrefs.push_notifications,
        [type]: !currentPrefs.push_notifications?.[type]
      }
    });
  };

  const toggleEmailNotification = (type) => {
    const currentPrefs = preferences || { push_notifications: {}, email_notifications: {} };
    updatePreferencesMutation.mutate({
      email_notifications: {
        ...currentPrefs.email_notifications,
        [type]: !currentPrefs.email_notifications?.[type]
      }
    });
  };

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Bell className="w-8 h-8 text-purple-400" />
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <p className="text-gray-400">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                onClick={() => markAllAsReadMutation.mutate()}
                variant="outline"
                disabled={markAllAsReadMutation.isPending}
                className="bg-white/5 border-white/20"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              className="bg-white/5 border-white/20"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        <Tabs value={showSettings ? "settings" : "notifications"} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/10">
            <TabsTrigger 
              value="notifications" 
              onClick={() => setShowSettings(false)}
            >
              Notifications
            </TabsTrigger>
            <TabsTrigger 
              value="settings"
              onClick={() => setShowSettings(true)}
            >
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { value: "all", label: "All", icon: Bell },
                { value: "unread", label: "Unread", icon: Bell, badge: unreadCount },
                { value: "social", label: "Social", icon: Users },
                { value: "messages", label: "Messages", icon: MessageCircle },
                { value: "bookings", label: "Bookings", icon: Package },
                { value: "payments", label: "Payments", icon: DollarSign }
              ].map(({ value, label, icon: Icon, badge }) => (
                <Button
                  key={value}
                  onClick={() => setFilterType(value)}
                  variant={filterType === value ? "default" : "outline"}
                  className={filterType === value 
                    ? "bg-purple-600 hover:bg-purple-700" 
                    : "bg-white/5 border-white/20"
                  }
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                  {badge > 0 && (
                    <Badge className="ml-2 bg-red-500">{badge}</Badge>
                  )}
                </Button>
              ))}
            </div>

            {notifications.length === 0 && !isLoading && (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {filterType === "all" ? "No notifications yet" : "No notifications in this category"}
                </h3>
                <p className="text-gray-400">
                  {filterType === "all" 
                    ? "When you get notifications, they'll show up here" 
                    : "Try selecting a different filter"}
                </p>
              </div>
            )}

            <div className="space-y-3">
          {notifications.map((notification, idx) => {
            const Icon = notificationIcons[notification.type] || Bell;
            const iconColor = notificationColors[notification.type] || "text-gray-400";

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  className={`bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer ${
                    !notification.read ? 'border-l-4 border-l-purple-500' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {notification.sender_photo ? (
                        <div className="relative flex-shrink-0">
                          <img 
                            src={notification.sender_photo} 
                            alt="" 
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${notification.read ? 'bg-gray-700' : 'bg-purple-600'} flex items-center justify-center`}>
                            <Icon className={`w-3 h-3 ${iconColor}`} />
                          </div>
                        </div>
                      ) : (
                        <div className={`w-12 h-12 ${notification.read ? 'bg-white/5' : 'bg-purple-500/20'} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-6 h-6 ${iconColor}`} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`font-semibold ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>

                        <p className="text-gray-400 text-sm mb-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <p className="text-gray-500 text-xs">
                            {new Date(notification.created_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(notification.id);
                            }}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
            </div>

            <LoadMoreButton
              onLoadMore={() => setPage(p => p + 1)}
              hasMore={filteredNotifications.length > page * itemsPerPage}
              loading={isLoading}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-purple-400" />
                  In-App Notifications
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  Choose which notifications you want to see in the app
                </p>

                <div className="space-y-4">
                  {[
                    { type: "post_like", label: "Post Likes", desc: "When someone likes your post" },
                    { type: "new_comment", label: "Comments", desc: "When someone comments on your post" },
                    { type: "comment_reply", label: "Comment Replies", desc: "When someone replies to your comment" },
                    { type: "comment_like", label: "Comment Likes", desc: "When someone likes your comment" },
                    { type: "new_follower", label: "New Followers", desc: "When someone follows you" },
                    { type: "follow_request", label: "Follow Requests", desc: "When someone requests to follow you" },
                    { type: "friend_listening", label: "Friend Listening", desc: "When friends start listening to music" },
                    { type: "new_message", label: "Messages", desc: "New direct messages" },
                    { type: "chat_message", label: "Chat Messages", desc: "New chat room messages" },
                    { type: "booking_confirmed", label: "Bookings", desc: "Booking confirmations and updates" },
                    { type: "booking_update", label: "Booking Updates", desc: "Updates on your bookings" },
                    { type: "payment_received", label: "Payments", desc: "When you receive a payment" },
                    { type: "tip_received", label: "Tips", desc: "When someone tips you" },
                    { type: "important_update", label: "Important Updates", desc: "Critical system notifications" }
                  ].map(({ type, label, desc }) => (
                    <div key={type} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div className="flex-1">
                        <p className="text-white font-medium">{label}</p>
                        <p className="text-gray-400 text-sm">{desc}</p>
                      </div>
                      <button
                        onClick={() => togglePushNotification(type)}
                        disabled={updatePreferencesMutation.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          preferences?.push_notifications?.[type] !== false
                            ? 'bg-purple-600'
                            : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            preferences?.push_notifications?.[type] !== false
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-400" />
                  Email Notifications
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  Receive important notifications via email
                </p>

                <div className="space-y-4">
                  {[
                    { type: "comment_reply", label: "Comment Replies", desc: "When someone replies to your comment" },
                    { type: "new_follower", label: "New Followers", desc: "Weekly summary of new followers" },
                    { type: "follow_request", label: "Follow Requests", desc: "When someone requests to follow you" },
                    { type: "new_message", label: "Messages", desc: "Important direct messages" },
                    { type: "booking_confirmed", label: "Bookings", desc: "Booking confirmations" },
                    { type: "payment_received", label: "Payments", desc: "Payment notifications" },
                    { type: "tip_received", label: "Tips", desc: "When you receive tips" }
                  ].map(({ type, label, desc }) => (
                    <div key={type} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div className="flex-1">
                        <p className="text-white font-medium">{label}</p>
                        <p className="text-gray-400 text-sm">{desc}</p>
                      </div>
                      <button
                        onClick={() => toggleEmailNotification(type)}
                        disabled={updatePreferencesMutation.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          preferences?.email_notifications?.[type]
                            ? 'bg-blue-600'
                            : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            preferences?.email_notifications?.[type]
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Other Preferences</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex-1">
                      <p className="text-white font-medium">Summary Emails</p>
                      <p className="text-gray-400 text-sm">Daily/weekly activity summaries</p>
                    </div>
                    <button
                      onClick={() => updatePreferencesMutation.mutate({ 
                        summary_emails: !preferences?.summary_emails 
                      })}
                      disabled={updatePreferencesMutation.isPending}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences?.summary_emails !== false
                          ? 'bg-green-600'
                          : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences?.summary_emails !== false
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex-1">
                      <p className="text-white font-medium">Marketing Emails</p>
                      <p className="text-gray-400 text-sm">Promotional offers and updates</p>
                    </div>
                    <button
                      onClick={() => updatePreferencesMutation.mutate({ 
                        marketing_emails: !preferences?.marketing_emails 
                      })}
                      disabled={updatePreferencesMutation.isPending}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences?.marketing_emails
                          ? 'bg-green-600'
                          : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences?.marketing_emails
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
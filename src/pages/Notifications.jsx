import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Bell, CheckCircle, Package, Heart, MessageCircle, 
  AlertCircle, DollarSign, Users, Trash2
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LoadMoreButton } from "../components/Pagination";

const notificationIcons = {
  booking_confirmed: CheckCircle,
  payment_received: DollarSign,
  order_update: Package,
  new_follower: Users,
  new_message: MessageCircle,
  dispute_opened: AlertCircle,
  dispute_resolved: CheckCircle,
  tip_received: Heart,
  escrow_released: DollarSign,
  system_alert: Bell,
  new_comment: MessageCircle,
  comment_reply: MessageCircle,
  comment_like: Heart,
  post_like: Heart
};

const notificationColors = {
  booking_confirmed: "text-green-400",
  payment_received: "text-green-400",
  order_update: "text-blue-400",
  new_follower: "text-purple-400",
  new_message: "text-cyan-400",
  dispute_opened: "text-red-400",
  dispute_resolved: "text-green-400",
  tip_received: "text-pink-400",
  escrow_released: "text-yellow-400",
  system_alert: "text-orange-400",
  new_comment: "text-cyan-400",
  comment_reply: "text-blue-400",
  comment_like: "text-pink-400",
  post_like: "text-pink-400"
};

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const { data: allNotifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date'),
    initialData: []
  });

  const notifications = allNotifications.slice(0, page * itemsPerPage);

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

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Bell className="w-8 h-8 text-purple-400" />
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-gray-400">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsReadMutation.mutate()}
              variant="outline"
              disabled={markAllAsReadMutation.isLoading}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {notifications.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No notifications yet</h3>
            <p className="text-gray-400">When you get notifications, they'll show up here</p>
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
          hasMore={allNotifications.length > page * itemsPerPage}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
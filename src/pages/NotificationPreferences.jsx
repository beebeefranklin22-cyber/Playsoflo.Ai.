import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  Bell, Car, Home, DollarSign, MessageCircle, Heart, 
  AlertCircle, Sparkles, Mail, Smartphone, ChevronLeft
} from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const notificationCategories = [
  {
    title: "Ride & Transportation",
    icon: Car,
    color: "text-blue-400",
    settings: [
      { key: "ride_requests", label: "New Ride Requests", description: "Get notified of new ride requests (drivers only)" },
      { key: "ride_updates", label: "Ride Status Updates", description: "Driver arrived, ride started, completed" },
      { key: "rental_reminders", label: "Rental Reminders", description: "Pickup and return reminders" }
    ]
  },
  {
    title: "Bookings & Properties",
    icon: Home,
    color: "text-green-400",
    settings: [
      { key: "booking_requests", label: "New Booking Requests", description: "New property or service bookings (providers only)" },
      { key: "booking_updates", label: "Booking Updates", description: "Booking confirmations and changes" }
    ]
  },
  {
    title: "Payments & Finances",
    icon: DollarSign,
    color: "text-yellow-400",
    settings: [
      { key: "payment_alerts", label: "Payment Alerts", description: "Payment confirmations and receipts" },
      { key: "settlements", label: "Damage Settlements", description: "Settlement proposals and updates" },
      { key: "affiliate_earnings", label: "Affiliate Earnings", description: "Commission updates and payouts" }
    ]
  },
  {
    title: "Messages & Social",
    icon: MessageCircle,
    color: "text-purple-400",
    settings: [
      { key: "messages", label: "Messages", description: "New direct messages and chats" },
      { key: "social_interactions", label: "Social Activity", description: "Likes, comments, follows, friend requests" },
      { key: "content_updates", label: "Content Updates", description: "Updates from creators you follow" }
    ]
  },
  {
    title: "Platform & Listings",
    icon: Sparkles,
    color: "text-cyan-400",
    settings: [
      { key: "system_updates", label: "System Updates", description: "App updates and new features" },
      { key: "new_listings", label: "New Listings", description: "When new items are listed on the platform" },
      { key: "promotions", label: "Promotions", description: "Special offers and deals" }
    ]
  },
  {
    title: "Delivery Channels",
    icon: Bell,
    color: "text-pink-400",
    settings: [
      { key: "email_notifications", label: "Email Notifications", description: "Receive notifications via email" },
      { key: "push_notifications", label: "Push Notifications", description: "Browser push notifications" }
    ]
  }
];

export default function NotificationPreferences() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [preferences, setPreferences] = useState({});

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setPreferences(user.notification_preferences || {});
      } catch (error) {
        console.log("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const updatePreferencesMutation = useMutation({
    mutationFn: (newPrefs) => base44.auth.updateMe({ notification_preferences: newPrefs }),
    onSuccess: () => {
      toast.success('Notification preferences updated!');
    }
  });

  const togglePreference = (key) => {
    const newPrefs = {
      ...preferences,
      [key]: !preferences[key]
    };
    setPreferences(newPrefs);
    updatePreferencesMutation.mutate(newPrefs);
  };

  const enableAll = () => {
    const allEnabled = {};
    notificationCategories.forEach(cat => {
      cat.settings.forEach(setting => {
        allEnabled[setting.key] = true;
      });
    });
    setPreferences(allEnabled);
    updatePreferencesMutation.mutate(allEnabled);
    toast.success('All notifications enabled');
  };

  const disableAll = () => {
    const allDisabled = {};
    notificationCategories.forEach(cat => {
      cat.settings.forEach(setting => {
        allDisabled[setting.key] = false;
      });
    });
    setPreferences(allDisabled);
    updatePreferencesMutation.mutate(allDisabled);
    toast.success('All notifications disabled');
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-950 via-gray-950 to-blue-950 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20 mb-4"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Notification Settings</h1>
              <p className="text-gray-400">Customize what notifications you receive</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={enableAll}
                size="sm"
                variant="outline"
                className="bg-white/5 border-white/20"
              >
                Enable All
              </Button>
              <Button
                onClick={disableAll}
                size="sm"
                variant="outline"
                className="bg-white/5 border-white/20"
              >
                Disable All
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {notificationCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.title} className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${category.color}`} />
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {category.settings.map((setting) => (
                    <div
                      key={setting.key}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium mb-1">{setting.label}</p>
                        <p className="text-gray-400 text-sm">{setting.description}</p>
                      </div>
                      <Switch
                        checked={preferences[setting.key] !== false}
                        onCheckedChange={() => togglePreference(setting.key)}
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 mt-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Smartphone className="w-8 h-8 text-blue-400 flex-shrink-0" />
              <div>
                <h3 className="text-white font-bold mb-2">Push Notifications</h3>
                <p className="text-gray-300 text-sm mb-3">
                  Enable browser push notifications to get real-time alerts even when the app is closed. 
                  You can control this in your browser settings.
                </p>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if ('Notification' in window && Notification.permission === 'default') {
                      Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                          toast.success('Push notifications enabled!');
                        }
                      });
                    } else if (Notification.permission === 'granted') {
                      toast.info('Push notifications already enabled');
                    } else {
                      toast.error('Please enable notifications in browser settings');
                    }
                  }}
                >
                  Enable Push Notifications
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
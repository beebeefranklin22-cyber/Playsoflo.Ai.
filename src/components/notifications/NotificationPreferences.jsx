import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Car, Package, Briefcase, Store, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function NotificationPreferences({ currentUser, onUpdate }) {
  const [preferences, setPreferences] = useState({
    ride_requests: true,
    delivery_orders: true,
    service_bookings: true,
    food_orders: true,
    tips_received: true,
    messages: true,
    follower_updates: false,
    payment_alerts: true,
    enable_sound: true,
    enable_vibration: true,
    auto_dismiss_seconds: 10
  });

  useEffect(() => {
    if (currentUser?.notification_push_preferences) {
      setPreferences(currentUser.notification_push_preferences);
    }
  }, [currentUser]);

  const handleSave = async () => {
    try {
      await base44.auth.updateMe({
        notification_push_preferences: preferences
      });
      toast.success('✅ Notification preferences saved!');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to save preferences');
    }
  };

  const togglePref = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const notificationTypes = [
    { key: 'ride_requests', label: 'New Ride Requests', icon: Car, color: 'blue', userType: 'is_driver' },
    { key: 'delivery_orders', label: 'New Delivery Orders', icon: Package, color: 'green', userType: 'is_delivery_driver' },
    { key: 'service_bookings', label: 'New Service Bookings', icon: Briefcase, color: 'purple', userType: 'is_provider' },
    { key: 'food_orders', label: 'New Food Orders', icon: Store, color: 'orange', userType: 'is_restaurant_owner' },
    { key: 'tips_received', label: 'Tips Received', icon: Bell, color: 'pink', userType: null },
    { key: 'messages', label: 'New Messages', icon: Bell, color: 'indigo', userType: null },
    { key: 'follower_updates', label: 'Follower Updates', icon: Bell, color: 'cyan', userType: null },
    { key: 'payment_alerts', label: 'Payment Alerts', icon: Bell, color: 'green', userType: null }
  ];

  const relevantNotifications = notificationTypes.filter(
    type => !type.userType || currentUser?.[type.userType]
  );

  return (
    <Card className="glass-effect border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Push Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {relevantNotifications.map(type => (
          <div key={type.key} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-${type.color}-500/20 rounded-lg flex items-center justify-center`}>
                <type.icon className={`w-5 h-5 text-${type.color}-400`} />
              </div>
              <div>
                <p className="text-white font-medium">{type.label}</p>
                <p className="text-gray-400 text-xs">Get notified instantly</p>
              </div>
            </div>
            <button
              onClick={() => togglePref(type.key)}
              className={`w-12 h-6 rounded-full transition ${
                preferences[type.key] ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                preferences[type.key] ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        ))}

        <div className="border-t border-white/10 pt-4 mt-4">
          <h4 className="text-white font-medium mb-3">Notification Behavior</h4>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl mb-2">
            <div>
              <p className="text-white font-medium">Sound</p>
              <p className="text-gray-400 text-xs">Play sound on notification</p>
            </div>
            <button
              onClick={() => togglePref('enable_sound')}
              className={`w-12 h-6 rounded-full transition ${
                preferences.enable_sound ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                preferences.enable_sound ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-white font-medium">Vibration</p>
              <p className="text-gray-400 text-xs">Vibrate on notification</p>
            </div>
            <button
              onClick={() => togglePref('enable_vibration')}
              className={`w-12 h-6 rounded-full transition ${
                preferences.enable_vibration ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                preferences.enable_vibration ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}
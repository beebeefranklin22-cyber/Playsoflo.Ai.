import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Bell, Mail, Smartphone, Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function NotificationPreferences({ currentUser }) {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({
    new_booking_email: true,
    new_booking_app: true,
    booking_cancellation_email: true,
    booking_cancellation_app: true,
    new_message_email: false,
    new_message_app: true,
    contract_signing_email: true,
    contract_signing_app: true,
    payment_received_email: true,
    payment_received_app: true,
    review_posted_email: true,
    review_posted_app: true,
    booking_reminder_email: true,
    booking_reminder_app: true,
    low_availability_email: true,
    low_availability_app: true,
    booking_threshold: 3,
    message_threshold: 5,
    reminder_hours_before: 24
  });

  const { data: existingPrefs } = useQuery({
    queryKey: ['notification-preferences', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;
      const prefs = await base44.entities.NotificationPreferences.filter({
        user_email: currentUser.email
      });
      return prefs[0] || null;
    },
    enabled: !!currentUser,
    onSuccess: (data) => {
      if (data) {
        setPreferences(prev => ({ ...prev, ...data }));
      }
    }
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (prefs) => {
      if (existingPrefs) {
        return await base44.entities.NotificationPreferences.update(existingPrefs.id, prefs);
      } else {
        return await base44.entities.NotificationPreferences.create({
          user_email: currentUser.email,
          ...prefs
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notification-preferences']);
      toast.success('Notification preferences saved');
    }
  });

  const handleSave = () => {
    savePreferencesMutation.mutate(preferences);
  };

  const notificationTypes = [
    {
      title: 'New Bookings',
      description: 'When someone books your service',
      emailKey: 'new_booking_email',
      appKey: 'new_booking_app',
      icon: Bell,
      color: 'text-green-400'
    },
    {
      title: 'Booking Cancellations',
      description: 'When a customer cancels a booking',
      emailKey: 'booking_cancellation_email',
      appKey: 'booking_cancellation_app',
      icon: Bell,
      color: 'text-red-400'
    },
    {
      title: 'New Messages',
      description: 'When you receive a message from customers',
      emailKey: 'new_message_email',
      appKey: 'new_message_app',
      icon: Mail,
      color: 'text-blue-400'
    },
    {
      title: 'Contract Signing',
      description: 'When a customer signs a service agreement',
      emailKey: 'contract_signing_email',
      appKey: 'contract_signing_app',
      icon: Bell,
      color: 'text-purple-400'
    },
    {
      title: 'Payment Received',
      description: 'When you receive a payment',
      emailKey: 'payment_received_email',
      appKey: 'payment_received_app',
      icon: Bell,
      color: 'text-yellow-400'
    },
    {
      title: 'New Reviews',
      description: 'When someone leaves a review',
      emailKey: 'review_posted_email',
      appKey: 'review_posted_app',
      icon: Bell,
      color: 'text-pink-400'
    },
    {
      title: 'Booking Reminders',
      description: 'Upcoming booking reminders',
      emailKey: 'booking_reminder_email',
      appKey: 'booking_reminder_app',
      icon: Bell,
      color: 'text-orange-400'
    },
    {
      title: 'Low Availability',
      description: 'When you have limited slots remaining',
      emailKey: 'low_availability_email',
      appKey: 'low_availability_app',
      icon: Bell,
      color: 'text-cyan-400'
    }
  ];

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-300 text-sm">
            Customize how you receive notifications. Real-time in-app alerts keep you updated instantly, while email notifications provide a detailed record.
          </p>
        </div>

        {/* Notification Types */}
        <div className="space-y-4">
          {notificationTypes.map((type) => (
            <div key={type.title} className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <type.icon className={`w-5 h-5 ${type.color} mt-1`} />
                  <div>
                    <h4 className="text-white font-semibold">{type.title}</h4>
                    <p className="text-gray-400 text-sm">{type.description}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 ml-8">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400 text-sm">Email</span>
                  <Switch
                    checked={preferences[type.emailKey]}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, [type.emailKey]: checked })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400 text-sm">In-App</span>
                  <Switch
                    checked={preferences[type.appKey]}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, [type.appKey]: checked })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Threshold Settings */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-4">Notification Thresholds</h4>
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">
                Notify after this many unread messages:
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={preferences.message_threshold}
                onChange={(e) =>
                  setPreferences({ ...preferences, message_threshold: Number(e.target.value) })
                }
                className="bg-white/10 border-white/20 text-white max-w-xs"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">
                Send booking reminders (hours before):
              </label>
              <Input
                type="number"
                min="1"
                max="168"
                value={preferences.reminder_hours_before}
                onChange={(e) =>
                  setPreferences({ ...preferences, reminder_hours_before: Number(e.target.value) })
                }
                className="bg-white/10 border-white/20 text-white max-w-xs"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">
                Alert when available slots drop below:
              </label>
              <Input
                type="number"
                min="1"
                max="20"
                value={preferences.booking_threshold}
                onChange={(e) =>
                  setPreferences({ ...preferences, booking_threshold: Number(e.target.value) })
                }
                className="bg-white/10 border-white/20 text-white max-w-xs"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={savePreferencesMutation.isPending}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {savePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
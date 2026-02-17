import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileSelect } from "@/components/ui/MobileSelect";
import { triggerHaptic } from "@/components/ui/haptic";
import { Settings, Bell, Eye, DollarSign, Shield } from "lucide-react";
import { toast } from "sonner";

export default function ContentSettings({ currentUser }) {
  const [settings, setSettings] = useState({
    default_category: "entertainment",
    default_visibility: "public",
    auto_publish: false,
    notify_followers: true,
    enable_comments: true,
    enable_tips: true,
    min_tip_amount: 1,
    default_ppv_price: 4.99
  });

  const handleSave = () => {
    // Save to user preferences
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Default Content Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Default Category</label>
              <MobileSelect 
                value={settings.default_category} 
                onValueChange={(v) => {
                  triggerHaptic('light');
                  setSettings({...settings, default_category: v});
                }}
                placeholder="Select category"
                triggerClassName="bg-white/10 border-white/20 text-white"
              >
                <MobileSelect.Item value="sports">Sports</MobileSelect.Item>
                <MobileSelect.Item value="entertainment">Entertainment</MobileSelect.Item>
                <MobileSelect.Item value="gaming">Gaming</MobileSelect.Item>
                <MobileSelect.Item value="music">Music</MobileSelect.Item>
                <MobileSelect.Item value="news">News</MobileSelect.Item>
                <MobileSelect.Item value="lifestyle">Lifestyle</MobileSelect.Item>
              </MobileSelect>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Default Visibility</label>
              <MobileSelect 
                value={settings.default_visibility} 
                onValueChange={(v) => {
                  triggerHaptic('light');
                  setSettings({...settings, default_visibility: v});
                }}
                placeholder="Select visibility"
                triggerClassName="bg-white/10 border-white/20 text-white"
              >
                <MobileSelect.Item value="public">Public</MobileSelect.Item>
                <MobileSelect.Item value="followers">Followers Only</MobileSelect.Item>
                <MobileSelect.Item value="members">Members Only</MobileSelect.Item>
                <MobileSelect.Item value="private">Private</MobileSelect.Item>
              </MobileSelect>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer p-3 bg-white/5 rounded-lg">
            <span className="text-white">Notify followers when going live</span>
            <input
              type="checkbox"
              checked={settings.notify_followers}
              onChange={(e) => setSettings({...settings, notify_followers: e.target.checked})}
              className="w-5 h-5 rounded accent-purple-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-3 bg-white/5 rounded-lg">
            <span className="text-white">Auto-publish uploaded content</span>
            <input
              type="checkbox"
              checked={settings.auto_publish}
              onChange={(e) => setSettings({...settings, auto_publish: e.target.checked})}
              className="w-5 h-5 rounded accent-purple-500"
            />
          </label>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Engagement Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer p-3 bg-white/5 rounded-lg">
            <span className="text-white">Enable comments</span>
            <input
              type="checkbox"
              checked={settings.enable_comments}
              onChange={(e) => setSettings({...settings, enable_comments: e.target.checked})}
              className="w-5 h-5 rounded accent-purple-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer p-3 bg-white/5 rounded-lg">
            <span className="text-white">Enable tipping</span>
            <input
              type="checkbox"
              checked={settings.enable_tips}
              onChange={(e) => setSettings({...settings, enable_tips: e.target.checked})}
              className="w-5 h-5 rounded accent-purple-500"
            />
          </label>

          {settings.enable_tips && (
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Minimum Tip Amount ($)</label>
              <Input
                type="number"
                step="0.01"
                value={settings.min_tip_amount}
                onChange={(e) => setSettings({...settings, min_tip_amount: Number(e.target.value)})}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Monetization Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Default PPV Price ($)</label>
            <Input
              type="number"
              step="0.01"
              value={settings.default_ppv_price}
              onChange={(e) => setSettings({...settings, default_ppv_price: Number(e.target.value)})}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full bg-purple-600 hover:bg-purple-700">
        Save Settings
      </Button>
    </div>
  );
}
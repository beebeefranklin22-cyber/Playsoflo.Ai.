import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, Wind, Droplets, Music, MessageCircle, Save, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function RidePreferencesModal({ isOpen, onClose, currentUser, onUpdate }) {
  const [preferences, setPreferences] = useState({
    quiet_ride: false,
    ac_preference: "medium",
    music_genre: "none",
    conversation: "minimal",
    no_perfume: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser?.ride_preferences) {
      setPreferences(currentUser.ride_preferences);
    }
  }, [currentUser]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        ride_preferences: preferences
      });
      toast.success("Ride preferences saved!");
      onUpdate?.();
      onClose();
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Ride Preferences</DialogTitle>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-400 text-sm">
            Set your default preferences for all rides
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Quiet Ride */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-white font-semibold">Quiet Ride</div>
                  <div className="text-gray-400 text-sm">Prefer minimal conversation</div>
                </div>
              </div>
              <button
                onClick={() => setPreferences({ ...preferences, quiet_ride: !preferences.quiet_ride })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.quiet_ride ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.quiet_ride ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* AC Preference */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Wind className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-white font-semibold">Air Conditioning</div>
                <div className="text-gray-400 text-sm">Preferred temperature</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["off", "low", "medium", "high"].map((level) => (
                <button
                  key={level}
                  onClick={() => setPreferences({ ...preferences, ac_preference: level })}
                  className={`py-2 px-3 rounded-lg font-medium transition capitalize ${
                    preferences.ac_preference === level
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Music Genre */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <Music className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-white font-semibold">Music Preference</div>
                <div className="text-gray-400 text-sm">What you'd like to listen to</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {["none", "pop", "rock", "hip-hop", "jazz", "classical", "electronic", "country"].map((genre) => (
                <button
                  key={genre}
                  onClick={() => setPreferences({ ...preferences, music_genre: genre })}
                  className={`py-2 px-3 rounded-lg font-medium transition capitalize ${
                    preferences.music_genre === genre
                      ? 'bg-green-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Level */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-white font-semibold">Conversation</div>
                <div className="text-gray-400 text-sm">How chatty you are</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "none", label: "Quiet" },
                { value: "minimal", label: "Minimal" },
                { value: "friendly", label: "Friendly" }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setPreferences({ ...preferences, conversation: value })}
                  className={`py-2 px-3 rounded-lg font-medium transition ${
                    preferences.conversation === value
                      ? 'bg-cyan-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* No Strong Scents */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <div className="text-white font-semibold">Scent Sensitive</div>
                  <div className="text-gray-400 text-sm">No perfume or air fresheners</div>
                </div>
              </div>
              <button
                onClick={() => setPreferences({ ...preferences, no_perfume: !preferences.no_perfume })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.no_perfume ? 'bg-pink-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.no_perfume ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 bg-white/5 border-white/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Volume2, Wind, Droplets, Music, MessageCircle, Thermometer, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function RidePreferencesModal({ isOpen, onClose, currentUser, onUpdate }) {
  const [preferences, setPreferences] = useState({
    quiet_ride: currentUser?.ride_preferences?.quiet_ride || false,
    ac_preference: currentUser?.ride_preferences?.ac_preference || "medium",
    no_perfume: currentUser?.ride_preferences?.no_perfume || false,
    music_genre: currentUser?.ride_preferences?.music_genre || "none",
    conversation: currentUser?.ride_preferences?.conversation || "friendly",
    temperature_preference: currentUser?.ride_preferences?.temperature_preference || "moderate"
  });

  const updateMutation = useMutation({
    mutationFn: () => base44.auth.updateMe({ ride_preferences: preferences }),
    onSuccess: () => {
      toast.success('Ride preferences updated!');
      onUpdate?.();
      onClose();
    }
  });

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gray-900 rounded-2xl max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Ride Preferences</h3>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* Quiet Ride */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white font-medium">Quiet Ride</p>
                <p className="text-gray-400 text-sm">Prefer minimal conversation</p>
              </div>
            </div>
            <button
              onClick={() => setPreferences(prev => ({ ...prev, quiet_ride: !prev.quiet_ride }))}
              className={`w-12 h-6 rounded-full transition ${
                preferences.quiet_ride ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                preferences.quiet_ride ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* AC Preference */}
          <div>
            <Label className="text-gray-400 mb-2 flex items-center gap-2">
              <Wind className="w-4 h-4 text-blue-400" />
              Air Conditioning
            </Label>
            <Select 
              value={preferences.ac_preference} 
              onValueChange={(v) => setPreferences(prev => ({ ...prev, ac_preference: v }))}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Temperature */}
          <div>
            <Label className="text-gray-400 mb-2 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-400" />
              Temperature Preference
            </Label>
            <Select 
              value={preferences.temperature_preference} 
              onValueChange={(v) => setPreferences(prev => ({ ...prev, temperature_preference: v }))}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cool">Cool</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* No Perfume */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <Droplets className="w-5 h-5 text-pink-400" />
              <div>
                <p className="text-white font-medium">No Strong Scents</p>
                <p className="text-gray-400 text-sm">Sensitive to perfumes</p>
              </div>
            </div>
            <button
              onClick={() => setPreferences(prev => ({ ...prev, no_perfume: !prev.no_perfume }))}
              className={`w-12 h-6 rounded-full transition ${
                preferences.no_perfume ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                preferences.no_perfume ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Music Genre */}
          <div>
            <Label className="text-gray-400 mb-2 flex items-center gap-2">
              <Music className="w-4 h-4 text-green-400" />
              Music Preference
            </Label>
            <Select 
              value={preferences.music_genre} 
              onValueChange={(v) => setPreferences(prev => ({ ...prev, music_genre: v }))}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Music / Quiet</SelectItem>
                <SelectItem value="pop">Pop</SelectItem>
                <SelectItem value="rock">Rock</SelectItem>
                <SelectItem value="hip-hop">Hip-Hop</SelectItem>
                <SelectItem value="electronic">Electronic</SelectItem>
                <SelectItem value="jazz">Jazz</SelectItem>
                <SelectItem value="classical">Classical</SelectItem>
                <SelectItem value="country">Country</SelectItem>
                <SelectItem value="latin">Latin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conversation */}
          <div>
            <Label className="text-gray-400 mb-2 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-cyan-400" />
              Conversation Style
            </Label>
            <Select 
              value={preferences.conversation} 
              onValueChange={(v) => setPreferences(prev => ({ ...prev, conversation: v }))}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal - Keep it quiet</SelectItem>
                <SelectItem value="friendly">Friendly - Small talk is fine</SelectItem>
                <SelectItem value="chatty">Chatty - Love to talk!</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-6 border-t border-white/10">
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
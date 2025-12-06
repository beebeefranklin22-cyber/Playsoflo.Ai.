import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Palette, X, Check, Loader2, Sparkles, 
  Layout, Type, Image as ImageIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const themePresets = [
  { name: "Default", primary: "#9333ea", secondary: "#ec4899", bg: "from-purple-600 to-pink-600" },
  { name: "Ocean", primary: "#0ea5e9", secondary: "#06b6d4", bg: "from-blue-600 to-cyan-600" },
  { name: "Sunset", primary: "#f97316", secondary: "#eab308", bg: "from-orange-500 to-yellow-500" },
  { name: "Forest", primary: "#22c55e", secondary: "#14b8a6", bg: "from-green-600 to-teal-600" },
  { name: "Midnight", primary: "#6366f1", secondary: "#8b5cf6", bg: "from-indigo-600 to-violet-600" },
  { name: "Rose", primary: "#f43f5e", secondary: "#ec4899", bg: "from-rose-500 to-pink-500" }
];

const layoutOptions = [
  { value: "default", label: "Default", icon: Layout },
  { value: "minimal", label: "Minimal", icon: Type },
  { value: "showcase", label: "Showcase", icon: ImageIcon }
];

const fontOptions = [
  { value: "default", label: "Default" },
  { value: "modern", label: "Modern" },
  { value: "elegant", label: "Elegant" },
  { value: "playful", label: "Playful" }
];

export default function ProfileCustomization({ isOpen, onClose, currentUser, onUpdate }) {
  const [customization, setCustomization] = useState({
    theme: currentUser?.profile_customization?.theme || "Default",
    primary_color: currentUser?.profile_customization?.primary_color || "#9333ea",
    secondary_color: currentUser?.profile_customization?.secondary_color || "#ec4899",
    layout: currentUser?.profile_customization?.layout || "default",
    font_style: currentUser?.profile_customization?.font_style || "default",
    show_stats: currentUser?.profile_customization?.show_stats !== false,
    show_badges: currentUser?.profile_customization?.show_badges !== false,
    animated_background: currentUser?.profile_customization?.animated_background || false,
    custom_status: currentUser?.profile_customization?.custom_status || ""
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe({ profile_customization: data }),
    onSuccess: () => {
      toast.success('Profile customized!');
      onUpdate?.();
      onClose();
    }
  });

  const applyPreset = (preset) => {
    setCustomization(prev => ({
      ...prev,
      theme: preset.name,
      primary_color: preset.primary,
      secondary_color: preset.secondary
    }));
  };

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
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Palette className="w-6 h-6 text-purple-400" />
            Customize Profile
          </h3>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* Theme Presets */}
          <div>
            <Label className="text-gray-400 mb-3 block">Theme Presets</Label>
            <div className="grid grid-cols-3 gap-3">
              {themePresets.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={`p-3 rounded-xl border transition ${
                    customization.theme === preset.name 
                      ? 'border-purple-500 bg-purple-500/20' 
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className={`h-8 rounded-lg bg-gradient-to-r ${preset.bg} mb-2`} />
                  <p className="text-white text-sm">{preset.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400 mb-2 block">Primary Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customization.primary_color}
                  onChange={(e) => setCustomization(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="w-12 h-10 rounded-lg cursor-pointer"
                />
                <Input
                  value={customization.primary_color}
                  onChange={(e) => setCustomization(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white flex-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-400 mb-2 block">Secondary Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customization.secondary_color}
                  onChange={(e) => setCustomization(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="w-12 h-10 rounded-lg cursor-pointer"
                />
                <Input
                  value={customization.secondary_color}
                  onChange={(e) => setCustomization(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white flex-1"
                />
              </div>
            </div>
          </div>

          {/* Layout */}
          <div>
            <Label className="text-gray-400 mb-3 block">Profile Layout</Label>
            <div className="flex gap-3">
              {layoutOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setCustomization(prev => ({ ...prev, layout: option.value }))}
                  className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition ${
                    customization.layout === option.value 
                      ? 'border-purple-500 bg-purple-500/20' 
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <option.icon className="w-6 h-6 text-white" />
                  <span className="text-white text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Style */}
          <div>
            <Label className="text-gray-400 mb-2 block">Font Style</Label>
            <div className="flex flex-wrap gap-2">
              {fontOptions.map(font => (
                <button
                  key={font.value}
                  onClick={() => setCustomization(prev => ({ ...prev, font_style: font.value }))}
                  className={`px-4 py-2 rounded-lg border transition ${
                    customization.font_style === font.value 
                      ? 'border-purple-500 bg-purple-500/20 text-white' 
                      : 'border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Status */}
          <div>
            <Label className="text-gray-400 mb-2 block">Custom Status</Label>
            <Input
              value={customization.custom_status}
              onChange={(e) => setCustomization(prev => ({ ...prev, custom_status: e.target.value }))}
              placeholder="What's on your mind?"
              className="bg-white/10 border-white/20 text-white"
              maxLength={50}
            />
          </div>

          {/* Toggle Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <span className="text-white">Show Profile Stats</span>
              <button
                onClick={() => setCustomization(prev => ({ ...prev, show_stats: !prev.show_stats }))}
                className={`w-12 h-6 rounded-full transition ${
                  customization.show_stats ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                  customization.show_stats ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <span className="text-white">Show Badges</span>
              <button
                onClick={() => setCustomization(prev => ({ ...prev, show_badges: !prev.show_badges }))}
                className={`w-12 h-6 rounded-full transition ${
                  customization.show_badges ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                  customization.show_badges ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-white">Animated Background</span>
              </div>
              <button
                onClick={() => setCustomization(prev => ({ ...prev, animated_background: !prev.animated_background }))}
                className={`w-12 h-6 rounded-full transition ${
                  customization.animated_background ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                  customization.animated_background ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <Label className="text-gray-400 mb-2 block">Preview</Label>
            <div 
              className="h-24 rounded-xl overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, ${customization.primary_color}, ${customization.secondary_color})` 
              }}
            >
              <div className="h-full flex items-center justify-center">
                <p className="text-white font-bold text-lg">Your Profile</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/10">
          <Button
            onClick={() => updateMutation.mutate(customization)}
            disabled={updateMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Customization
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
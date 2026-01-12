import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Volume2, VolumeX, Music, Music2, Sliders } from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";

export default function GameSettings({ isOpen, onClose, gameName, onSettingsChange }) {
  const [settings, setSettings] = useState({
    soundEnabled: true,
    musicEnabled: true,
    difficulty: 'medium',
    controlSensitivity: 5,
    visualEffects: true
  });

  useEffect(() => {
    // Load saved settings from localStorage
    const saved = localStorage.getItem(`game_settings_${gameName}`);
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, [gameName]);

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(`game_settings_${gameName}`, JSON.stringify(newSettings));
    onSettingsChange?.(newSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-lg flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-3xl p-6 max-w-md w-full border-2 border-purple-500/30 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-purple-400" />
            Settings
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Sound Effects */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-cyan-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-500" />
              )}
              <div>
                <p className="text-white font-medium">Sound Effects</p>
                <p className="text-gray-400 text-sm">Game sounds and audio</p>
              </div>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
            />
          </div>

          {/* Music */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.musicEnabled ? (
                <Music className="w-5 h-5 text-purple-400" />
              ) : (
                <Music2 className="w-5 h-5 text-gray-500" />
              )}
              <div>
                <p className="text-white font-medium">Background Music</p>
                <p className="text-gray-400 text-sm">In-game soundtrack</p>
              </div>
            </div>
            <Switch
              checked={settings.musicEnabled}
              onCheckedChange={(checked) => updateSetting('musicEnabled', checked)}
            />
          </div>

          {/* Visual Effects */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded bg-gradient-to-r from-cyan-400 to-purple-400" />
              <div>
                <p className="text-white font-medium">Visual Effects</p>
                <p className="text-gray-400 text-sm">Particles and glow</p>
              </div>
            </div>
            <Switch
              checked={settings.visualEffects}
              onCheckedChange={(checked) => updateSetting('visualEffects', checked)}
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-white font-medium mb-2 block">Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {['easy', 'medium', 'hard'].map(diff => (
                <button
                  key={diff}
                  onClick={() => updateSetting('difficulty', diff)}
                  className={`py-2 px-4 rounded-lg font-medium transition capitalize ${
                    settings.difficulty === diff
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Control Sensitivity */}
          <div>
            <label className="text-white font-medium mb-2 block">
              Control Sensitivity: {settings.controlSensitivity}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={settings.controlSensitivity}
              onChange={(e) => updateSetting('controlSensitivity', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          Save Settings
        </Button>
      </motion.div>
    </div>
  );
}
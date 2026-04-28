import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, X, Check, Clock, Search, Loader2 } from "lucide-react";
import { setUserTimezone } from "../utils/dateUtils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Common IANA timezones grouped by region
const TIMEZONE_OPTIONS = [
  { label: "Eastern Time (ET)", value: "America/New_York" },
  { label: "Central Time (CT)", value: "America/Chicago" },
  { label: "Mountain Time (MT)", value: "America/Denver" },
  { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
  { label: "Alaska Time (AKT)", value: "America/Anchorage" },
  { label: "Hawaii Time (HAT)", value: "Pacific/Honolulu" },
  { label: "Atlantic Time (AT)", value: "America/Halifax" },
  { label: "UTC", value: "UTC" },
  { label: "London (GMT/BST)", value: "Europe/London" },
  { label: "Paris/Berlin (CET)", value: "Europe/Paris" },
  { label: "Dubai (GST)", value: "Asia/Dubai" },
  { label: "India (IST)", value: "Asia/Kolkata" },
  { label: "Singapore (SGT)", value: "Asia/Singapore" },
  { label: "Tokyo (JST)", value: "Asia/Tokyo" },
  { label: "Sydney (AEST)", value: "Australia/Sydney" },
  { label: "São Paulo (BRT)", value: "America/Sao_Paulo" },
  { label: "Mexico City (CST)", value: "America/Mexico_City" },
  { label: "Lagos (WAT)", value: "Africa/Lagos" },
  { label: "Nairobi (EAT)", value: "Africa/Nairobi" },
  { label: "Johannesburg (SAST)", value: "Africa/Johannesburg" },
];

function getCurrentLocalTime(tz) {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export default function CitySelector({ user, onClose, onSaved }) {
  const [city, setCity] = useState(user?.city || "");
  const [timezone, setTimezone] = useState(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York");
  const [saving, setSaving] = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const [localTime, setLocalTime] = useState(getCurrentLocalTime(timezone));

  useEffect(() => {
    setLocalTime(getCurrentLocalTime(timezone));
    const interval = setInterval(() => setLocalTime(getCurrentLocalTime(timezone)), 30000);
    return () => clearInterval(interval);
  }, [timezone]);

  const filteredTimezones = TIMEZONE_OPTIONS.filter(tz =>
    tz.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
    tz.value.toLowerCase().includes(tzSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!city.trim()) {
      toast.error("Please enter your city");
      return;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({ city: city.trim(), timezone });
      setUserTimezone(timezone); // persist locally for immediate effect
      toast.success("Location & timezone saved!");
      if (onSaved) onSaved({ city: city.trim(), timezone });
      if (onClose) onClose();
    } catch (err) {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-3xl border border-white/10 overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Set Your Location</h2>
              <p className="text-gray-400 text-xs">For accurate times & local results</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: "calc(90vh - 80px)" }}>
          {/* City input */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block font-medium">Your City</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Miami, FL"
                className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
            <p className="text-gray-500 text-xs mt-1.5">Used to show nearby services, events & listings</p>
          </div>

          {/* Timezone */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" /> Timezone
              {localTime && (
                <span className="text-purple-400 font-normal ml-auto">Now: {localTime}</span>
              )}
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={tzSearch}
                onChange={e => setTzSearch(e.target.value)}
                placeholder="Search timezone..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition text-sm"
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-white/5">
              {filteredTimezones.map(tz => (
                <button
                  key={tz.value}
                  onClick={() => setTimezone(tz.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition hover:bg-white/10 ${
                    timezone === tz.value ? "bg-purple-600/20 text-purple-300" : "text-gray-300"
                  }`}
                >
                  <span>{tz.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs">{getCurrentLocalTime(tz.value)}</span>
                    {timezone === tz.value && <Check className="w-4 h-4 text-purple-400" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Current selection preview */}
          {(city || timezone) && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <p className="text-purple-300 text-sm">
                📍 <strong>{city || "No city set"}</strong> — {TIMEZONE_OPTIONS.find(t => t.value === timezone)?.label || timezone}
              </p>
              {localTime && <p className="text-gray-400 text-xs mt-1">Local time: {localTime}</p>}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Location"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
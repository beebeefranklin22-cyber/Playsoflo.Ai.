import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scissors, X, Loader2, CheckCircle, Film } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ClipCreator({ stream, currentUser, onClose }) {
  const [clipTitle, setClipTitle] = useState(`Clip from ${stream?.title || "stream"}`);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const durationSecs = endTime - startTime;

  const handleSave = async () => {
    if (!clipTitle.trim()) return toast.error("Please enter a clip title");
    if (startTime >= endTime) return toast.error("End time must be after start time");
    if (durationSecs > 600) return toast.error("Clip cannot exceed 10 minutes");

    setSaving(true);
    try {
      await base44.entities.StreamingContent.create({
        title: clipTitle.trim(),
        type: "movie",
        category: stream.category || "entertainment",
        description: `Clip from: ${stream.title}. Starts at ${formatTime(startTime)}, ends at ${formatTime(endTime)}.`,
        video_url: stream.video_url || null,
        thumbnail_url: stream.thumbnail_url || null,
        is_live: false,
        status: "published",
        content_type: "clip",
        creator_email: currentUser.email,
        creator_username: currentUser.username || currentUser.full_name,
        tags: ["clip", "live", ...(stream.tags || [])],
        clip_start_time: startTime,
        clip_end_time: endTime,
        source_stream_id: stream.id,
        views: 0,
        is_monetized: false,
      });
      setSaved(true);
      toast.success("Clip saved to your channel!");
      setTimeout(onClose, 1500);
    } catch (e) {
      toast.error("Failed to save clip");
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-xl px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 border border-white/15 rounded-2xl p-6 w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Create Clip</h3>
              <p className="text-gray-400 text-xs">Save a moment from this stream</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="text-gray-300 text-sm font-medium mb-1.5 block">Clip Title</label>
          <Input
            value={clipTitle}
            onChange={(e) => setClipTitle(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder-gray-400"
            placeholder="Give your clip a name..."
          />
        </div>

        {/* Time Range */}
        <div className="mb-4">
          <label className="text-gray-300 text-sm font-medium mb-1.5 block">
            Clip Range — {formatTime(startTime)} to {formatTime(endTime)}
            <span className="text-purple-400 ml-2">({durationSecs}s)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-500 text-xs mb-1">Start (seconds)</p>
              <Input
                type="number"
                min={0}
                max={endTime - 1}
                value={startTime}
                onChange={(e) => setStartTime(Math.max(0, parseInt(e.target.value) || 0))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">End (seconds)</p>
              <Input
                type="number"
                min={startTime + 1}
                value={endTime}
                onChange={(e) => setEndTime(Math.max(startTime + 1, parseInt(e.target.value) || startTime + 1))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          {/* Quick presets */}
          <div className="flex gap-2 mt-2">
            {[30, 60, 120].map((sec) => (
              <button
                key={sec}
                onClick={() => { setStartTime(0); setEndTime(sec); }}
                className="text-xs px-2.5 py-1 bg-white/10 hover:bg-purple-500/20 text-gray-300 hover:text-purple-300 rounded-full transition border border-white/10 hover:border-purple-500/30"
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Preview note */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
          <Film className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-blue-300 text-xs leading-relaxed">
            The clip will be saved to <strong>your VOD channel</strong> and can be shared socially. It references the same video source as this stream.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1 border-white/20 hover:bg-white/5 text-white">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || saved || durationSecs <= 0}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {saved ? (
              <><CheckCircle className="w-4 h-4 mr-2" />Saved!</>
            ) : saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Scissors className="w-4 h-4 mr-2" />Save Clip</>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
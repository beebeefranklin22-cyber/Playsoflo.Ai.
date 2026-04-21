import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Parse "1:23:45" or "12:34" or "45" → seconds
function parseTimestamp(str) {
  const parts = String(str).trim().split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

// seconds → "H:MM:SS" or "M:SS"
export function formatSeconds(secs) {
  const s = Math.floor(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function ChapterEditor({ chapters = [], onChange, videoRef }) {
  const [title, setTitle] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [error, setError] = useState("");

  const sorted = [...chapters].sort((a, b) => a.start - b.start);

  const handleAdd = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { setError("Chapter title required"); return; }

    let start;
    if (timestamp.trim()) {
      start = parseTimestamp(timestamp);
      if (start === null || start < 0) { setError("Invalid timestamp (use M:SS or H:MM:SS)"); return; }
    } else if (videoRef?.current) {
      start = Math.floor(videoRef.current.currentTime);
    } else {
      setError("Enter a timestamp or play the video to the right position"); return;
    }

    if (chapters.some(c => c.start === start)) { setError("A chapter already starts at this time"); return; }

    onChange([...chapters, { title: trimmedTitle, start }]);
    setTitle("");
    setTimestamp("");
    setError("");
  };

  const handleRemove = (idx) => {
    const updated = [...chapters];
    updated.splice(idx, 1);
    onChange(updated);
  };

  const handleUseCurrent = () => {
    if (videoRef?.current) {
      setTimestamp(formatSeconds(Math.floor(videoRef.current.currentTime)));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-purple-400" />
        <span className="text-white font-semibold text-sm">Chapters</span>
        <span className="text-gray-600 text-xs ml-auto">{chapters.length} chapter{chapters.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Add chapter */}
      <div className="space-y-2 mb-3">
        <div className="flex gap-2">
          <Input
            value={timestamp}
            onChange={e => { setTimestamp(e.target.value); setError(""); }}
            placeholder="0:00"
            className="w-24 flex-shrink-0 bg-white/8 border-white/15 text-white placeholder-gray-600 text-sm h-8"
            style={{ background: "rgba(255,255,255,0.06)" }}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
          {videoRef && (
            <button onClick={handleUseCurrent} className="text-xs text-purple-400 hover:text-purple-300 flex-shrink-0 px-1">
              Use current
            </button>
          )}
          <Input
            value={title}
            onChange={e => { setTitle(e.target.value); setError(""); }}
            placeholder="Chapter title"
            className="flex-1 bg-white/8 border-white/15 text-white placeholder-gray-600 text-sm h-8"
            style={{ background: "rgba(255,255,255,0.06)" }}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} size="sm" className="bg-purple-600 hover:bg-purple-700 h-8 px-2 flex-shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <p className="text-gray-600 text-xs">First chapter should start at 0:00</p>
      </div>

      {/* Chapter list */}
      <AnimatePresence>
        {sorted.length > 0 && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {sorted.map((c, i) => (
              <motion.div
                key={`${c.start}-${i}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5"
              >
                <GripVertical className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                <span className="text-purple-400 font-mono text-xs w-14 flex-shrink-0">{formatSeconds(c.start)}</span>
                <span className="text-white text-sm flex-1 truncate">{c.title}</span>
                <button onClick={() => handleRemove(chapters.indexOf(c))} className="p-0.5 hover:text-red-400 text-gray-600 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
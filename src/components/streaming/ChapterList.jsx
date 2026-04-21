import React from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import { formatSeconds } from "./ChapterEditor";
import { motion } from "framer-motion";

export default function ChapterList({ chapters = [], currentTime = 0, duration = 0, onSeek }) {
  if (!chapters || chapters.length === 0) return null;

  const sorted = [...chapters].sort((a, b) => a.start - b.start);

  // Find active chapter
  const activeIdx = sorted.reduce((best, c, i) => {
    return c.start <= currentTime ? i : best;
  }, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 flex-shrink-0">
        <BookOpen className="w-4 h-4 text-purple-400" />
        <span className="text-white font-bold text-sm">Chapters</span>
        <span className="ml-auto text-gray-600 text-xs">{sorted.length}</span>
      </div>

      {/* Progress bar with chapter markers */}
      {duration > 0 && (
        <div className="px-4 py-3 flex-shrink-0">
          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              onSeek(pct * duration);
            }}
          >
            {/* Playback progress */}
            <div
              className="absolute inset-y-0 left-0 bg-purple-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
            />
            {/* Chapter markers */}
            {sorted.slice(1).map((c, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                style={{ left: `${(c.start / duration) * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Chapter items */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {sorted.map((c, i) => {
          const isActive = i === activeIdx;
          const endTime = sorted[i + 1]?.start ?? duration;
          const durationSec = endTime > 0 ? endTime - c.start : null;

          return (
            <motion.button
              key={i}
              onClick={() => onSeek(c.start)}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                isActive
                  ? "bg-purple-500/20 border border-purple-500/30"
                  : "hover:bg-white/5 border border-transparent"
              }`}
            >
              {/* Chapter number */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                isActive ? "bg-purple-500 text-white" : "bg-white/10 text-gray-400"
              }`}>
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-gray-300"}`}>{c.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`font-mono text-xs ${isActive ? "text-purple-300" : "text-gray-600"}`}>
                    {formatSeconds(c.start)}
                  </span>
                  {durationSec !== null && durationSec > 0 && (
                    <span className="text-gray-700 text-xs">{formatSeconds(durationSec)}</span>
                  )}
                </div>
              </div>

              {isActive && <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize, Minimize, Settings
} from "lucide-react";

function formatTime(secs) {
  if (!secs || isNaN(secs)) return "0:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VODControls({ videoRef, onEnded }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [visible, setVisible] = useState(true);
  const [showVolume, setShowVolume] = useState(false);
  const hideTimer = useRef(null);
  const progressRef = useRef(null);
  const containerRef = useRef(null);

  const resetHideTimer = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setVisible(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => { setPlaying(false); setVisible(true); };
    const onTimeUpdate = () => setCurrentTime(vid.currentTime);
    const onDurationChange = () => setDuration(vid.duration);
    const onVolumeChange = () => { setVolume(vid.volume); setMuted(vid.muted); };
    const onProgress = () => {
      if (vid.buffered.length > 0) {
        setBuffered(vid.buffered.end(vid.buffered.length - 1));
      }
    };
    const onEnd = () => { setPlaying(false); setVisible(true); onEnded?.(); };

    vid.addEventListener("play", onPlay);
    vid.addEventListener("pause", onPause);
    vid.addEventListener("timeupdate", onTimeUpdate);
    vid.addEventListener("durationchange", onDurationChange);
    vid.addEventListener("loadedmetadata", () => setDuration(vid.duration));
    vid.addEventListener("volumechange", onVolumeChange);
    vid.addEventListener("progress", onProgress);
    vid.addEventListener("ended", onEnd);

    return () => {
      vid.removeEventListener("play", onPlay);
      vid.removeEventListener("pause", onPause);
      vid.removeEventListener("timeupdate", onTimeUpdate);
      vid.removeEventListener("durationchange", onDurationChange);
      vid.removeEventListener("loadedmetadata", () => {});
      vid.removeEventListener("volumechange", onVolumeChange);
      vid.removeEventListener("progress", onProgress);
      vid.removeEventListener("ended", onEnd);
    };
  }, [videoRef, onEnded]);

  // Fullscreen change detection
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const vid = videoRef.current;
      if (!vid) return;
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); vid.paused ? vid.play() : vid.pause(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); vid.currentTime = Math.max(0, vid.currentTime - 10); }
      if (e.key === "ArrowRight") { e.preventDefault(); vid.currentTime = Math.min(vid.duration, vid.currentTime + 10); }
      if (e.key === "m") vid.muted = !vid.muted;
      if (e.key === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [videoRef]);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.paused ? vid.play() : vid.pause();
    resetHideTimer();
  };

  const seek = (secs) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = Math.max(0, Math.min(vid.duration, vid.currentTime + secs));
    resetHideTimer();
  };

  const handleProgressClick = (e) => {
    const bar = progressRef.current;
    const vid = videoRef.current;
    if (!bar || !vid) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    vid.currentTime = pct * vid.duration;
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
  };

  const handleVolumeChange = (e) => {
    const vid = videoRef.current;
    if (!vid) return;
    const v = parseFloat(e.target.value);
    vid.volume = v;
    vid.muted = v === 0;
  };

  const toggleFullscreen = () => {
    const container = videoRef.current?.closest(".vod-fullscreen-container") || videoRef.current?.parentElement;
    if (!document.fullscreenElement) {
      container?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      className="absolute inset-0 flex flex-col justify-between"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={togglePlay}
      style={{ cursor: visible ? "default" : "none" }}
    >
      {/* Center play/pause flash on click */}
      <div className="flex-1 flex items-center justify-center pointer-events-none">
        {!playing && (
          <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className={`transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="px-3 pb-1">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="relative h-1 rounded-full bg-white/20 cursor-pointer group hover:h-2 transition-all"
          >
            {/* Buffered */}
            <div
              className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
              style={{ width: `${bufferedPct}%` }}
            />
            {/* Progress */}
            <div
              className="absolute inset-y-0 left-0 bg-purple-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-1 px-3 pb-3 bg-gradient-to-t from-black/80 to-transparent">
          {/* Rewind 10s */}
          <button
            onClick={() => seek(-10)}
            className="p-2 hover:bg-white/10 rounded-full transition text-white"
            title="Rewind 10s (←)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-2 hover:bg-white/10 rounded-full transition text-white"
            title="Play/Pause (Space)"
          >
            {playing
              ? <Pause className="w-5 h-5 fill-white" />
              : <Play className="w-5 h-5 fill-white ml-0.5" />
            }
          </button>

          {/* Fast Forward 10s */}
          <button
            onClick={() => seek(10)}
            className="p-2 hover:bg-white/10 rounded-full transition text-white"
            title="Forward 10s (→)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Time */}
          <span className="text-white text-xs font-mono ml-1 select-none">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <div className="relative flex items-center" onMouseEnter={() => setShowVolume(true)} onMouseLeave={() => setShowVolume(false)}>
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-white/10 rounded-full transition text-white"
              title="Mute (M)"
            >
              {muted || volume === 0
                ? <VolumeX className="w-4 h-4" />
                : <Volume2 className="w-4 h-4" />
              }
            </button>
            {showVolume && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 rounded-xl px-3 py-2 flex flex-col items-center gap-1">
                <input
                  type="range"
                  min="0" max="1" step="0.05"
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 accent-purple-500"
                  style={{ writingMode: 'horizontal-tb' }}
                />
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/10 rounded-full transition text-white"
            title="Fullscreen (F)"
          >
            {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
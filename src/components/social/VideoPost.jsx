import React, { useRef, useState, useEffect } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

export default function VideoPost({ post }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  // Track if user explicitly paused so we don't re-autoplay
  const userPausedRef = useRef(false);

  const posterSrc = post.thumbnail_url || (post.image_url ? `${post.image_url}#t=0.1` : undefined);

  // Intersection Observer — autoplay when ≥50% visible, pause when not
  useEffect(() => {
    const vid = videoRef.current;
    const container = containerRef.current;
    if (!vid || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!userPausedRef.current) {
            vid.play().catch(() => {});
          }
        } else {
          vid.pause();
          // Don't set userPausedRef here — scrolling away isn't a user pause
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handlePlay = (e) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      userPausedRef.current = false;
      vid.play().catch(() => {});
    } else {
      userPausedRef.current = true;
      vid.pause();
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setMuted(vid.muted);
  };

  return (
    <div ref={containerRef} className="relative w-full aspect-square bg-gray-900 overflow-hidden">
      <video
        ref={videoRef}
        src={post.image_url}
        poster={posterSrc}
        className="w-full h-full object-cover"
        playsInline
        muted={muted}
        preload="metadata"
        loop
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      {/* Tap to play/pause overlay — only shows play icon when paused */}
      <button
        onClick={handlePlay}
        className="absolute inset-0 flex items-center justify-center group"
        aria-label={playing ? "Pause" : "Play"}
      >
        {!playing && (
          <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm group-active:scale-95 transition-transform">
            <Play className="w-7 h-7 text-white ml-1" fill="white" />
          </div>
        )}
      </button>

      {/* Mute toggle — bottom right */}
      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm z-10"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          <VolumeX className="w-4 h-4 text-white" />
        ) : (
          <Volume2 className="w-4 h-4 text-white" />
        )}
      </button>
    </div>
  );
}
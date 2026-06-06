import React, { useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

export default function VideoPost({ post }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  // Use poster from DB, or trick browser into showing first frame via #t=0.1
  const posterSrc = post.thumbnail_url || (post.image_url ? `${post.image_url}#t=0.1` : undefined);

  const handlePlay = (e) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setPlaying(true);
    } else {
      vid.pause();
      setPlaying(false);
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
    <div className="relative w-full aspect-square bg-gray-900 overflow-hidden">
      <video
        ref={videoRef}
        src={post.image_url}
        poster={posterSrc}
        className="w-full h-full object-cover"
        playsInline
        muted={muted}
        preload="metadata"
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        loop={false}
      />

      {/* Play/Pause overlay — tap anywhere on video */}
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
        className="absolute bottom-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm"
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
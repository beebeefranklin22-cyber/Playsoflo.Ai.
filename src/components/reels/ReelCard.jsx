import React, { useRef, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, MessageCircle, Share2, Music, Volume2, VolumeX, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function ReelCard({ reel, currentUser, isActive, onCommentClick }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(reel.liked_by?.includes(currentUser?.email));
  const [likesCount, setLikesCount] = useState(reel.likes_count || 0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isActive]);

  // Track views
  useEffect(() => {
    if (isActive) {
      base44.entities.Reel.update(reel.id, { views_count: (reel.views_count || 0) + 1 }).catch(() => {});
    }
  }, [isActive, reel.id]);

  const handleLike = async () => {
    if (!currentUser) { toast.error("Sign in to like reels"); return; }
    const alreadyLiked = liked;
    const newLikedBy = alreadyLiked
      ? (reel.liked_by || []).filter(e => e !== currentUser.email)
      : [...(reel.liked_by || []), currentUser.email];
    setLiked(!alreadyLiked);
    setLikesCount(prev => prev + (alreadyLiked ? -1 : 1));
    await base44.entities.Reel.update(reel.id, {
      liked_by: newLikedBy,
      likes_count: newLikedBy.length,
    }).catch(() => {});
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: reel.caption || "Check this reel!", url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    }
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video_url}
        className="w-full h-full object-cover"
        loop
        playsInline
        muted={muted}
        poster={reel.thumbnail_url}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

      {/* Mute toggle */}
      <button
        onClick={() => setMuted(m => !m)}
        className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10"
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Bottom left — creator info + caption */}
      <div className="absolute bottom-20 left-4 right-20 z-10">
        <button
          onClick={() => navigate(createPageUrl("UserProfile") + `?user=${encodeURIComponent(reel.creator_email)}`)}
          className="flex items-center gap-2 mb-2"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
            {reel.creator_photo
              ? <img src={reel.creator_photo} alt="" className="w-full h-full object-cover" />
              : (reel.creator_name?.[0] || "U")}
          </div>
          <span className="text-white font-bold text-sm drop-shadow">@{reel.creator_name || reel.creator_email}</span>
        </button>

        {reel.caption && (
          <p className="text-white text-sm leading-snug line-clamp-3 drop-shadow mb-2">{reel.caption}</p>
        )}

        {reel.audio_name && (
          <div className="flex items-center gap-1.5 text-white/80 text-xs">
            <Music className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
            <span className="truncate max-w-[180px]">{reel.audio_name}</span>
          </div>
        )}
      </div>

      {/* Right side — action buttons */}
      <div className="absolute bottom-20 right-3 z-10 flex flex-col items-center gap-5">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${liked ? "bg-red-500/30" : "bg-black/30 backdrop-blur-sm"}`}>
            <Heart className={`w-6 h-6 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{likesCount}</span>
        </button>

        <button onClick={() => onCommentClick?.(reel)} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{reel.comments_count || 0}</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">Share</span>
        </button>
      </div>
    </div>
  );
}
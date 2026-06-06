import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Bookmark, MapPin,
  Music, Sparkles, X, ChevronUp, ChevronDown, MoreHorizontal,
  Flag, EyeOff, Volume2, VolumeX
} from "lucide-react";
import VideoPost from "../social/VideoPost";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function FullScreenFeed({
  posts,
  currentUser,
  likedPosts,
  onToggleLike,
  onComment,
  onShare,
  onHide,
  onClose,
  startIndex = 0,
}) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [showMenu, setShowMenu] = useState(false);
  const [savedPosts, setSavedPosts] = useState(new Set());
  const containerRef = useRef(null);
  const touchStartY = useRef(null);
  const touchStartX = useRef(null);

  const visiblePosts = posts.filter(Boolean);
  const post = visiblePosts[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < visiblePosts.length - 1) {
      setCurrentIndex(i => i + 1);
      setShowMenu(false);
    }
  }, [currentIndex, visiblePosts.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setShowMenu(false);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") goNext();
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  // Touch swipe
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    const dx = Math.abs(touchStartX.current - e.changedTouches[0].clientX);
    // Only vertical swipes (ignore horizontal scroll)
    if (Math.abs(dy) > 60 && Math.abs(dy) > dx) {
      if (dy > 0) goNext();
      else goPrev();
    }
    touchStartY.current = null;
  };

  if (!post) return null;

  const isLiked = likedPosts.has(post.id);
  const likeCount = Array.isArray(post.liked_by) ? post.liked_by.length : (post.likes_count || 0);
  const isSaved = savedPosts.has(post.id);
  const isVideo = post.media_type === "video" || post.image_url?.match(/\.(mp4|webm|ogg|mov)/i);
  const displayName = post.creator_name || post.creator_username || post.created_by?.split("@")[0] || "User";

  const handleSave = () => {
    setSavedPosts(prev => {
      const next = new Set(prev);
      if (next.has(post.id)) { next.delete(post.id); toast.success("Removed from saved"); }
      else { next.add(post.id); toast.success("Post saved!"); }
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black flex flex-col"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Media — fills entire screen */}
      <AnimatePresence mode="wait">
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {isVideo ? (
            <div className="w-full h-full">
              <VideoPost post={post} fullScreen />
            </div>
          ) : (
            <img
              src={post.image_url}
              alt={post.caption}
              className="w-full h-full object-cover"
              draggable={false}
            />
          )}

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {visiblePosts.slice(Math.max(0, currentIndex - 3), currentIndex + 4).map((_, i) => {
            const idx = Math.max(0, currentIndex - 3) + i;
            return (
              <div
                key={idx}
                className={`rounded-full transition-all duration-200 ${
                  idx === currentIndex ? "w-4 h-2 bg-white" : "w-1.5 h-1.5 bg-white/40"
                }`}
              />
            );
          })}
        </div>

        <button
          onClick={() => setShowMenu(m => !m)}
          className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
        >
          <MoreHorizontal className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            className="absolute top-16 right-4 z-50 w-44 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            <button
              onClick={() => { onShare(post); setShowMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-white text-sm hover:bg-white/10 transition"
            >
              <Share2 className="w-4 h-4 text-blue-400" /> Share
            </button>
            <button
              onClick={() => { onHide(post.id); setShowMenu(false); onClose(); toast.success("Post hidden"); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-white text-sm hover:bg-white/10 transition"
            >
              <EyeOff className="w-4 h-4 text-gray-400" /> Hide post
            </button>
            <button
              onClick={() => { toast.success("Reported — we'll review it."); setShowMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 text-sm hover:bg-white/10 transition"
            >
              <Flag className="w-4 h-4" /> Report
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right action rail */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10">
        {/* Like */}
        <button
          onClick={() => onToggleLike(post.id, post)}
          className="flex flex-col items-center gap-1 active:scale-125 transition-transform"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isLiked ? "bg-red-500/20" : "bg-black/40 backdrop-blur-sm"}`}>
            <Heart className={`w-6 h-6 transition-colors ${isLiked ? "fill-red-500 text-red-500" : "text-white"}`} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{likeCount > 0 ? likeCount : ""}</span>
        </button>

        {/* Comment */}
        <button
          onClick={() => onComment(post)}
          className="flex flex-col items-center gap-1 active:scale-110 transition-transform"
        >
          <div className="w-12 h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{post.comments_count > 0 ? post.comments_count : ""}</span>
        </button>

        {/* Share */}
        <button
          onClick={() => onShare(post)}
          className="flex flex-col items-center gap-1 active:scale-110 transition-transform"
        >
          <div className="w-12 h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs drop-shadow">Share</span>
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          className="flex flex-col items-center gap-1 active:scale-110 transition-transform"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSaved ? "bg-yellow-500/20" : "bg-black/40 backdrop-blur-sm"}`}>
            <Bookmark className={`w-6 h-6 ${isSaved ? "fill-yellow-400 text-yellow-400" : "text-white"}`} />
          </div>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-8 pr-20">
        {/* Author */}
        <button
          onClick={() => navigate(createPageUrl("UserProfile") + `?email=${encodeURIComponent(post.created_by)}`)}
          className="flex items-center gap-2 mb-3"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden flex-shrink-0 border-2 border-white/20">
            {post.creator_profile_picture ? (
              <img src={post.creator_profile_picture} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-white font-bold text-sm drop-shadow">@{displayName}</span>
        </button>

        {/* Caption */}
        {post.caption && (
          <p className="text-white text-sm leading-relaxed mb-2 drop-shadow line-clamp-3">
            {post.caption}
          </p>
        )}

        {/* Location */}
        {post.location && (
          <div className="flex items-center gap-1 text-white/70 text-xs">
            <MapPin className="w-3 h-3" />
            {post.location}
          </div>
        )}

        {/* Music */}
        {post.music_playing && (
          <div className="flex items-center gap-2 mt-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 w-fit">
            <Music className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
            <span className="text-white text-xs truncate max-w-[180px]">{post.music_playing}</span>
          </div>
        )}
      </div>

      {/* Up / Down nav arrows — subtle */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+3rem)] z-10 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center opacity-40 hover:opacity-80 transition"
        >
          <ChevronUp className="w-5 h-5 text-white" />
        </button>
      )}
      {currentIndex < visiblePosts.length - 1 && (
        <button
          onClick={goNext}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[calc(50%+1rem)] z-10 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center opacity-40 hover:opacity-80 transition"
        >
          <ChevronDown className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs z-10">
        {currentIndex + 1} / {visiblePosts.length}
      </div>
    </div>
  );
}
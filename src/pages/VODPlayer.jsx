import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Eye, Calendar, MessageCircle, Clock,
  Play, Users, User, BookOpen, ListVideo, SkipForward
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import VideoComments from "../components/streaming/VideoComments";
import ChapterList from "../components/streaming/ChapterList";
import PlaylistManager from "../components/streaming/PlaylistManager";
import { createPageUrl } from "@/utils";

export default function VODPlayer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [comment, setComment] = useState("");
  const [activeTab, setActiveTab] = useState("comments"); // "comments" | "chat_replay"
  const [videoTime, setVideoTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showPlaylistManager, setShowPlaylistManager] = useState(false);
  const [playNextCountdown, setPlayNextCountdown] = useState(null);
  const videoRef = useRef(null);
  const countdownRef = useRef(null);

  const params = new URLSearchParams(window.location.search);
  const vodId = params.get("id");
  const playlistId = params.get("playlist");
  const playlistIndex = parseInt(params.get("idx") || "0");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch VOD content
  const { data: vod } = useQuery({
    queryKey: ["vod", vodId],
    queryFn: async () => {
      const results = await base44.entities.StreamingContent.filter({ id: vodId });
      return results[0] || null;
    },
    enabled: !!vodId
  });

  // Track view + auto-switch to chapters tab if available
  useEffect(() => {
    if (vod?.id) {
      base44.entities.StreamingContent.update(vod.id, { views: (vod.views || 0) + 1 }).catch(() => {});
      if (vod.chapters?.length > 0) setActiveTab("chapters");
    }
  }, [vod?.id]);

  // Fetch playlist context for Play Next
  const { data: playlist } = useQuery({
    queryKey: ["playlist", playlistId],
    queryFn: () => base44.entities.Playlist.filter({ id: playlistId }).then(r => r[0] || null),
    enabled: !!playlistId
  });

  const nextVideoId = playlist?.video_ids?.[playlistIndex + 1] || null;

  const { data: nextVod } = useQuery({
    queryKey: ["vod", nextVideoId],
    queryFn: () => base44.entities.StreamingContent.filter({ id: nextVideoId }).then(r => r[0] || null),
    enabled: !!nextVideoId
  });

  const goToNextVideo = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPlayNextCountdown(null);
    navigate(createPageUrl("VODPlayer") + `?id=${nextVideoId}&playlist=${playlistId}&idx=${playlistIndex + 1}`);
  };

  const handleVideoEnded = () => {
    if (!nextVideoId) return;
    let count = 10;
    setPlayNextCountdown(count);
    countdownRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownRef.current);
        goToNextVideo();
      } else {
        setPlayNextCountdown(count);
      }
    }, 1000);
  };

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  // Fetch persistent comments
  const { data: comments = [] } = useQuery({
    queryKey: ["vod-comments", vodId],
    queryFn: () => base44.entities.Comment.filter({ post_id: vodId }),
    enabled: !!vodId
  });

  // Fetch chat replay (archived chat messages from the original livestream)
  const { data: chatReplay = [] } = useQuery({
    queryKey: ["vod-chat-replay", vodId],
    queryFn: async () => {
      const msgs = await base44.entities.LivestreamChat.filter({ stream_id: vodId });
      return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!vodId
  });

  const sendCommentMutation = useMutation({
    mutationFn: () => base44.entities.Comment.create({
      post_id: vodId,
      author_email: currentUser.email,
      author_name: currentUser.full_name || currentUser.email.split("@")[0],
      author_avatar: currentUser.profile_picture || "",
      content: comment.trim()
    }),
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["vod-comments", vodId] });
    }
  });

  const sortedComments = [...comments].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  // Chat replay — show messages up to current video time
  const streamStartTime = vod?.stream_started_at ? new Date(vod.stream_started_at).getTime() : null;
  const visibleChatMessages = chatReplay.filter(msg => {
    if (!streamStartTime) return true;
    const msgOffset = (new Date(msg.created_date).getTime() - streamStartTime) / 1000;
    return msgOffset <= videoTime + 5;
  });

  const handleTimeUpdate = () => {
    if (videoRef.current) setVideoTime(videoRef.current.currentTime);
  };

  const handleSeekToChapter = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  if (!vod) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      <AnimatePresence>
        {showPlaylistManager && currentUser && (
          <PlaylistManager
            vodId={vodId}
            userEmail={currentUser.email}
            onClose={() => setShowPlaylistManager(false)}
          />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold truncate">{vod.title}</p>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
            <button
              onClick={() => navigate(createPageUrl("CreatorChannel") + `?email=${vod.creator_email}`)}
              className="flex items-center gap-1 hover:text-purple-400 transition"
            >
              <User className="w-3 h-3" />@{vod.creator_username || vod.creator_email}
            </button>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(vod.views || 0).toLocaleString()} views</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(vod.created_date).toLocaleDateString()}</span>
            {vod.content_type === "vod_from_live" && (
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">
                <Play className="w-2.5 h-2.5 mr-1" />
                Was Live
              </Badge>
            )}
          </div>
        </div>
        {currentUser && (
          <button
            onClick={() => setShowPlaylistManager(true)}
            className="p-2 hover:bg-white/10 rounded-full transition flex-shrink-0"
            title="Save to Playlist"
          >
            <ListVideo className="w-5 h-5 text-gray-300" />
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Video Player */}
        <div className="flex-1 lg:max-w-[calc(100%-380px)]">
          <div className="relative bg-black aspect-video w-full">
            {vod.video_url ? (
              <video
              ref={videoRef}
              src={vod.video_url}
              controls
              className="w-full h-full"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => { if (videoRef.current) setVideoDuration(videoRef.current.duration); }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnded}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Play className="w-16 h-16 text-white/20 mx-auto mb-3" />
                  <p className="text-gray-400">Video not available</p>
                </div>
              </div>
            )}
            {/* Play Next overlay */}
            {playNextCountdown !== null && nextVod && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <div className="text-center p-6 max-w-sm">
                  <SkipForward className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm mb-1">Up next</p>
                  <p className="text-white font-bold text-lg mb-4 line-clamp-2">{nextVod.title}</p>
                  <button
                    onClick={goToNextVideo}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition mb-2"
                  >
                    Play Now ({playNextCountdown}s)
                  </button>
                  <button
                    onClick={() => { clearInterval(countdownRef.current); setPlayNextCountdown(null); }}
                    className="text-gray-400 hover:text-white text-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Info + Description */}
          <div className="p-4 border-b border-white/10">
            <h1 className="text-xl font-bold text-white mb-2">{vod.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-3">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" />@{vod.creator_username || vod.creator_email}</span>
              <Badge className="bg-white/10 text-gray-300 capitalize">{vod.category}</Badge>
              {vod.duration && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{vod.duration}</span>}
            </div>
            {vod.description && (
              <p className="text-gray-400 text-sm leading-relaxed">{vod.description}</p>
            )}
            {vod.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {vod.tags.map((tag, i) => (
                  <span key={i} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Live Comments + Chat Replay */}
        <div className="w-full lg:w-[380px] lg:border-l border-white/10 flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>
          {/* Next in playlist banner */}
          {nextVod && playNextCountdown === null && (
            <div className="flex items-center gap-3 px-4 py-2 bg-purple-500/10 border-b border-purple-500/20 flex-shrink-0">
              <SkipForward className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">Up next</p>
                <p className="text-white text-xs font-medium truncate">{nextVod.title}</p>
              </div>
              <button onClick={goToNextVideo} className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex-shrink-0">
                Play
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-white/10 flex-shrink-0 overflow-x-auto">
            {vod?.chapters?.length > 0 && (
              <button
                onClick={() => setActiveTab("chapters")}
                className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-semibold transition ${
                  activeTab === "chapters" ? "text-white border-b-2 border-purple-500" : "text-gray-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Chapters
              </button>
            )}
            <button
              onClick={() => setActiveTab("comments")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition ${
                activeTab === "comments" ? "text-white border-b-2 border-purple-500" : "text-gray-400 hover:text-white"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Comments
            </button>
            {chatReplay.length > 0 && (
              <button
                onClick={() => setActiveTab("chat_replay")}
                className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-semibold transition ${
                  activeTab === "chat_replay" ? "text-white border-b-2 border-red-500" : "text-gray-400 hover:text-white"
                }`}
              >
                <span className="w-2 h-2 bg-red-400 rounded-full" />
                Replay
              </button>
            )}
            {vod?.creator_email && (
              <button
                onClick={() => navigate(createPageUrl("CreatorChannel") + `?email=${vod.creator_email}`)}
                className="px-3 py-3 text-gray-500 hover:text-white transition flex-shrink-0"
                title="View Creator Channel"
              >
                <User className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Chapters Tab */}
          {activeTab === "chapters" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ChapterList
                chapters={vod.chapters || []}
                currentTime={videoTime}
                duration={videoDuration}
                onSeek={handleSeekToChapter}
              />
            </div>
          )}

          {/* Live Comments Tab */}
          {activeTab === "comments" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <VideoComments contentId={vodId} />
            </div>
          )}

          {/* Chat Replay Tab */}
          {activeTab === "chat_replay" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-300 text-xs flex items-center gap-2 flex-shrink-0">
                <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                {isPlaying ? "Showing live chat as it happened" : "Play the video to see chat in sync"}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <AnimatePresence>
                  {visibleChatMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {msg.user_name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-purple-300 font-semibold text-xs">{msg.user_name}: </span>
                        <span className="text-gray-300 text-xs break-words">{msg.message}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {visibleChatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">Chat replay will appear as you watch</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
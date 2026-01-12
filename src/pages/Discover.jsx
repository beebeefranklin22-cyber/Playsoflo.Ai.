import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { 
  Heart, MessageCircle, Share2, Bookmark, Music, 
  Search, TrendingUp, Flame, Plus, Play, Volume2, VolumeX
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import VideoCreationModal from "../components/video/VideoCreationModal";
import VideoCommentsModal from "../components/video/VideoCommentsModal";

export default function Discover() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const videoRefs = useRef([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.log("User not authenticated");
      }
    };
    fetchUser();
  }, []);

  const { data: videos = [] } = useQuery({
    queryKey: ['discover-videos'],
    queryFn: async () => {
      const allVideos = await base44.entities.VideoPost.list('-engagement_score');
      return allVideos.slice(0, 50);
    }
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ['trending-challenges'],
    queryFn: async () => {
      return await base44.entities.Challenge.filter({ is_active: true }, '-total_views', 5);
    }
  });

  const { data: myLikes = [] } = useQuery({
    queryKey: ['my-video-likes', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.VideoLike.filter({ user_email: currentUser.email });
    },
    enabled: !!currentUser
  });

  const likeMutation = useMutation({
    mutationFn: async ({ videoId, isLiked }) => {
      if (isLiked) {
        const like = myLikes.find(l => l.video_id === videoId);
        if (like) await base44.entities.VideoLike.delete(like.id);
      } else {
        await base44.entities.VideoLike.create({
          video_id: videoId,
          user_email: currentUser.email
        });
      }
      
      const video = videos.find(v => v.id === videoId);
      await base44.asServiceRole.entities.VideoPost.update(videoId, {
        likes: (video.likes || 0) + (isLiked ? -1 : 1),
        engagement_score: (video.engagement_score || 0) + (isLiked ? -10 : 10)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-video-likes'] });
      queryClient.invalidateQueries({ queryKey: ['discover-videos'] });
    }
  });

  const shareMutation = useMutation({
    mutationFn: async (videoId) => {
      const video = videos.find(v => v.id === videoId);
      await base44.asServiceRole.entities.VideoPost.update(videoId, {
        shares_count: (video.shares_count || 0) + 1,
        engagement_score: (video.engagement_score || 0) + 5
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discover-videos'] });
      toast.success('Copied to clipboard!');
    }
  });

  useEffect(() => {
    const currentVideoRef = videoRefs.current[currentVideoIndex];
    if (currentVideoRef) {
      currentVideoRef.play().catch(() => {});
      currentVideoRef.muted = isMuted;
    }

    return () => {
      if (currentVideoRef) {
        currentVideoRef.pause();
      }
    };
  }, [currentVideoIndex, isMuted]);

  const handleScroll = (direction) => {
    if (direction === 'up' && currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    } else if (direction === 'down' && currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const handleLike = (video) => {
    if (!currentUser) {
      toast.error('Please login to like videos');
      return;
    }
    const isLiked = myLikes.some(l => l.video_id === video.id);
    likeMutation.mutate({ videoId: video.id, isLiked });
  };

  const handleShare = (video) => {
    navigator.clipboard.writeText(`${window.location.origin}${createPageUrl("Discover")}?video=${video.id}`);
    shareMutation.mutate(video.id);
  };

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <p className="text-white text-xl">No videos yet. Be the first to create!</p>
          <Button
            onClick={() => setShowCreationModal(true)}
            className="mt-4 bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Video
          </Button>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentVideoIndex];
  const isLiked = myLikes.some(l => l.video_id === currentVideo?.id);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/60 to-transparent p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex gap-4">
            <button
              onClick={() => navigate(createPageUrl("Discover"))}
              className="text-white font-bold text-lg"
            >
              For You
            </button>
            <button
              onClick={() => navigate(createPageUrl("Discover") + "?tab=following")}
              className="text-gray-400 font-semibold text-lg"
            >
              Following
            </button>
          </div>
          <Button
            onClick={() => navigate(createPageUrl("Discover") + "?tab=challenges")}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            <Flame className="w-4 h-4 mr-2" />
            Challenges
          </Button>
        </div>
      </div>

      {/* Video Container */}
      <div className="h-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentVideoIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full flex items-center justify-center"
          >
            <video
              ref={(el) => (videoRefs.current[currentVideoIndex] = el)}
              src={currentVideo?.video_url}
              className="h-full w-auto max-w-full"
              loop
              playsInline
              muted={isMuted}
            />
          </motion.div>
        </AnimatePresence>

        {/* Video Info Overlay */}
        <div className="absolute bottom-20 left-0 right-0 z-20 p-6">
          <div className="max-w-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {currentVideo?.creator_name?.[0] || 'U'}
              </div>
              <span className="text-white font-bold">{currentVideo?.creator_name || currentVideo?.creator_email}</span>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 h-7 px-3">
                Follow
              </Button>
            </div>
            <p className="text-white text-sm mb-2">{currentVideo?.caption}</p>
            {currentVideo?.hashtags?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {currentVideo.hashtags.map((tag, idx) => (
                  <span key={idx} className="text-blue-400 text-sm">#{tag}</span>
                ))}
              </div>
            )}
            {currentVideo?.sounds_used?.length > 0 && (
              <div className="flex items-center gap-2 mt-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 w-fit">
                <Music className="w-3 h-3 text-white" />
                <span className="text-white text-xs">{currentVideo.sounds_used[0]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons (Right Side) */}
        <div className="absolute right-4 bottom-40 z-20 flex flex-col gap-6">
          <button
            onClick={() => handleLike(currentVideo)}
            className="flex flex-col items-center gap-1"
          >
            <div className={`w-12 h-12 rounded-full ${isLiked ? 'bg-red-500' : 'bg-white/20'} backdrop-blur-sm flex items-center justify-center`}>
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-white text-white' : 'text-white'}`} />
            </div>
            <span className="text-white text-xs font-bold">{currentVideo?.likes || 0}</span>
          </button>

          <button
            onClick={() => {
              setSelectedVideo(currentVideo);
              setShowComments(true);
            }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs font-bold">{currentVideo?.comments_count || 0}</span>
          </button>

          <button
            onClick={() => handleShare(currentVideo)}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs font-bold">{currentVideo?.shares_count || 0}</span>
          </button>

          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Bookmark className="w-6 h-6 text-white" />
            </div>
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
            </div>
          </button>
        </div>

        {/* Navigation Buttons */}
        <div className="absolute right-1/2 translate-x-1/2 bottom-6 z-20 flex gap-4">
          <Button
            onClick={() => handleScroll('up')}
            disabled={currentVideoIndex === 0}
            size="icon"
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 disabled:opacity-30"
          >
            ↑
          </Button>
          <Button
            onClick={() => handleScroll('down')}
            disabled={currentVideoIndex === videos.length - 1}
            size="icon"
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 disabled:opacity-30"
          >
            ↓
          </Button>
        </div>
      </div>

      {/* Create Button */}
      <button
        onClick={() => setShowCreationModal(true)}
        className="fixed bottom-24 right-1/2 translate-x-1/2 z-30 w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* Modals */}
      <VideoCreationModal
        isOpen={showCreationModal}
        onClose={() => setShowCreationModal(false)}
        currentUser={currentUser}
        challenges={challenges}
      />

      {showComments && selectedVideo && (
        <VideoCommentsModal
          video={selectedVideo}
          currentUser={currentUser}
          onClose={() => {
            setShowComments(false);
            setSelectedVideo(null);
          }}
        />
      )}
    </div>
  );
}
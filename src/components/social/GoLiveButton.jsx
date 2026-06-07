import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Video, X, Loader2, Radio, Sparkles } from "lucide-react";
import FaceFiltersCamera from "../camera/FaceFiltersCamera";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GoLiveButton({ currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const [showFaceFilters, setShowFaceFilters] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      // Generate unique channel name before creating stream
      const channelName = `livestream_${Date.now()}_${(currentUser.id || currentUser.email || 'user').substring(0, 8)}`;
      
      // Create livestream content
      const stream = await base44.entities.StreamingContent.create({
        title: title || `${currentUser.full_name}'s Live Stream`,
        description: description || "Join me live!",
        type: "live_event",
        category: "entertainment",
        creator_email: currentUser.email,
        is_live: true,
        status: "live",
        visibility: "public",
        stream_started_at: new Date().toISOString(),
        agora_channel_name: channelName,
        rating: 0,
        requires_subscription: false,
        betting_available: false
      });

      // Update user status
      await base44.auth.updateMe({
        is_live_streaming: true,
        live_stream_id: stream.id
      }).catch(() => {});

      // Notify all followers (fire and forget)
      base44.entities.Follow.filter({ following_email: currentUser.email }).then(followers =>
        Promise.all(followers.slice(0, 100).map(f => 
          base44.entities.Notification.create({
            recipient_email: f.follower_email,
            type: "livestream_started",
            title: `${currentUser.full_name || 'Someone'} is live!`,
            message: title || "Join the livestream now",
            reference_type: "livestream",
            reference_id: stream.id,
            action_url: `/LivestreamViewer?id=${stream.id}`,
            sender_email: currentUser.email,
            sender_name: currentUser.full_name,
            sender_photo: currentUser.profile_picture,
            read: false
          }).catch(() => {})
        ))
      ).catch(() => {});

      return stream;
    },
    onSuccess: (stream) => {
      queryClient.invalidateQueries(['streaming-content']);
      queryClient.invalidateQueries(['active-streams']);
      toast.success('You are now live!');
      setShowModal(false);
      navigate(createPageUrl("LivestreamViewer") + `?id=${stream.id}&broadcaster=true`);
    },
    onError: (error) => {
      console.error('Go live error:', error);
      toast.error('Failed to go live: ' + error.message);
    }
  });

  if (!currentUser) return null;

  if (showFaceFilters) {
    return (
      <FaceFiltersCamera
        mode="video"
        onClose={() => setShowFaceFilters(false)}
        onCapture={() => setShowFaceFilters(false)}
      />
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 gap-2"
      >
        <Radio className="w-4 h-4" />
        Go Live
      </Button>

      {showModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-gray-900 rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Video className="w-6 h-6 text-red-500" />
                Start Livestream
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-white font-semibold mb-2 block">Stream Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's your stream about?"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="text-white font-semibold mb-2 block">Description (Optional)</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers what to expect..."
                  rows={3}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <button
                  onClick={() => { setShowModal(false); setShowFaceFilters(true); }}
                  className="w-full flex items-center gap-3 text-purple-300 hover:text-purple-200 transition"
                >
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <div className="text-left">
                    <p className="font-semibold text-sm">Try Face Filters before going live</p>
                    <p className="text-xs opacity-70">Test filters, test your look</p>
                  </div>
                </button>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-300 text-sm">
                  📡 Your followers will be notified when you go live. Make sure you're ready!
                </p>
              </div>

              <Button
                onClick={() => goLiveMutation.mutate()}
                disabled={goLiveMutation.isPending}
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 py-6 text-lg font-bold"
              >
                {goLiveMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Radio className="w-5 h-5 mr-2" />
                    Go Live Now
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
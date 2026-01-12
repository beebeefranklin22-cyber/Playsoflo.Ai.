import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Heart, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function VideoCommentsModal({ video, currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: ['video-comments', video.id],
    queryFn: async () => {
      return await base44.entities.VideoComment.filter({ video_id: video.id }, '-created_date');
    }
  });

  const commentMutation = useMutation({
    mutationFn: async (text) => {
      const comment = await base44.entities.VideoComment.create({
        video_id: video.id,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        comment_text: text
      });

      await base44.asServiceRole.entities.VideoPost.update(video.id, {
        comments_count: (video.comments_count || 0) + 1,
        engagement_score: (video.engagement_score || 0) + 3
      });

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-comments'] });
      queryClient.invalidateQueries({ queryKey: ['discover-videos'] });
      setCommentText("");
      toast.success('Comment posted!');
    }
  });

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-gray-950 to-gray-900 rounded-t-3xl border-t border-white/10 max-h-[80vh] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-bold">Comments ({comments.length})</h3>
        </div>
        <button onClick={onClose}>
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              {comment.user_name?.[0] || 'U'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-semibold text-sm">{comment.user_name}</span>
                {comment.is_creator_reply && (
                  <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">Creator</span>
                )}
              </div>
              <p className="text-gray-300 text-sm">{comment.comment_text}</p>
              <div className="flex items-center gap-4 mt-2">
                <button className="flex items-center gap-1 text-gray-400 hover:text-red-400 text-xs">
                  <Heart className="w-3 h-3" />
                  {comment.likes_count || 0}
                </button>
                <button className="text-gray-400 hover:text-white text-xs">Reply</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comment Input */}
      <div className="p-4 border-t border-white/10 bg-gray-950">
        <div className="flex gap-2">
          <Input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && commentText.trim()) {
                commentMutation.mutate(commentText);
              }
            }}
            placeholder="Add a comment..."
            className="bg-white/10 border-white/20 text-white"
            disabled={!currentUser}
          />
          <Button
            onClick={() => commentMutation.mutate(commentText)}
            disabled={!commentText.trim() || commentMutation.isPending || !currentUser}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
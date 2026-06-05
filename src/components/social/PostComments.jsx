import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Send, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatLocalTime } from "../utils/dateUtils";

export default function PostComments({ post, currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: () => base44.entities.Comment.filter({ post_id: post.id }, "-created_date"),
    refetchInterval: 5000,
  });

  // Real-time subscription — both author and commenter see updates instantly
  useEffect(() => {
    if (!post?.id) return;
    const unsub = base44.entities.Comment.subscribe((event) => {
      if (event.data?.post_id === post.id) {
        queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
        queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      }
    });
    return () => unsub();
  }, [post.id, queryClient]);

  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      const comment = await base44.entities.Comment.create({
        post_id: post.id,
        author_email: currentUser.email,
        author_name: currentUser.full_name || currentUser.email.split("@")[0],
        author_photo: currentUser.profile_picture,
        content,
        likes_count: 0,
        liked_by: [],
      });
      // Update post comment count
      await base44.entities.SocialPost.update(post.id, {
        comments_count: (post.comments_count || 0) + 1,
      });
      // Notify post owner
      if (post.created_by && post.created_by !== currentUser.email) {
        base44.entities.Notification.create({
          recipient_email: post.created_by,
          type: "post_comment",
          title: `${currentUser.full_name || "Someone"} commented on your post`,
          message: content.substring(0, 80),
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          reference_id: post.id,
          reference_type: "post",
          read: false,
        }).catch(() => {});
      }
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      setCommentText("");
    },
    onError: () => toast.error("Failed to post comment"),
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (comment) => {
      const alreadyLiked = comment.liked_by?.includes(currentUser.email);
      await base44.entities.Comment.update(comment.id, {
        likes_count: alreadyLiked
          ? Math.max(0, (comment.likes_count || 0) - 1)
          : (comment.likes_count || 0) + 1,
        liked_by: alreadyLiked
          ? (comment.liked_by || []).filter((e) => e !== currentUser.email)
          : [...(comment.liked_by || []), currentUser.email],
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", post.id] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!currentUser) { toast.error("Sign in to comment"); return; }
    addCommentMutation.mutate(commentText.trim());
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 z-[70] bg-[#111] rounded-t-3xl border border-white/10 flex flex-col"
      style={{ bottom: 0, maxHeight: "75dvh", height: "75dvh", paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
        <h3 className="text-white font-bold">Comments</h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
        {isLoading && (
          <p className="text-gray-500 text-center text-sm py-8">Loading comments...</p>
        )}
        {!isLoading && comments.length === 0 && (
          <p className="text-gray-500 text-center text-sm py-8">No comments yet. Be the first!</p>
        )}
        {comments.map((comment) => {
          const liked = comment.liked_by?.includes(currentUser?.email);
          return (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(comment.author_name?.[0] || "U").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-white font-semibold text-sm">{comment.author_name || comment.author_email?.split("@")[0]}</span>
                    <span className="text-gray-300 text-sm ml-2">{comment.content}</span>
                  </div>
                  <button
                    onClick={() => currentUser && likeCommentMutation.mutate(comment)}
                    className="flex items-center gap-1 flex-shrink-0"
                  >
                    <Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
                    {comment.likes_count > 0 && (
                      <span className="text-gray-500 text-xs">{comment.likes_count}</span>
                    )}
                  </button>
                </div>
                <p className="text-gray-600 text-xs mt-0.5">{formatLocalTime(comment.created_date)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pt-3 pb-4 border-t border-white/10 bg-[#111]">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(currentUser?.full_name?.[0] || "U").toUpperCase()}
          </div>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || addCommentMutation.isPending}
            className="w-9 h-9 bg-purple-600 rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-purple-700 transition"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
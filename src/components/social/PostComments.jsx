import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Send, Heart, CornerDownRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatLocalTime } from "../utils/dateUtils";

export default function PostComments({ post, currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); // { id, author_name }
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: () => base44.entities.Comment.filter({ post_id: post.id }, "-created_date"),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Real-time subscription
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
      if (!currentUser?.email) throw new Error("Not authenticated");
      const comment = await base44.entities.Comment.create({
        post_id: post.id,
        author_email: currentUser.email,
        author_name: currentUser.full_name || currentUser.email.split("@")[0],
        author_photo: currentUser.profile_picture,
        content,
        reply_to_id: replyingTo?.id || null,
        reply_to_name: replyingTo?.author_name || null,
        likes_count: 0,
        liked_by: [],
      });
      await base44.entities.SocialPost.update(post.id, {
        comments_count: (post.comments_count || 0) + 1,
      });
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
      // Notify person being replied to
      if (replyingTo && replyingTo.author_email && replyingTo.author_email !== currentUser.email) {
        base44.entities.Notification.create({
          recipient_email: replyingTo.author_email,
          type: "comment_reply",
          title: `${currentUser.full_name || "Someone"} replied to your comment`,
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
      setReplyingTo(null);
      // Scroll to bottom after posting
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 200);
    },
    onError: () => toast.error("Failed to post comment"),
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (comment) => {
      const alreadyLiked = comment.liked_by?.includes(currentUser?.email);
      await base44.entities.Comment.update(comment.id, {
        likes_count: alreadyLiked
          ? Math.max(0, (comment.likes_count || 0) - 1)
          : (comment.likes_count || 0) + 1,
        liked_by: alreadyLiked
          ? (comment.liked_by || []).filter((e) => e !== currentUser?.email)
          : [...(comment.liked_by || []), currentUser?.email],
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

  const handleReply = (comment) => {
    setReplyingTo({ id: comment.id, author_name: comment.author_name, author_email: comment.author_email });
    setCommentText(`@${comment.author_name} `);
    inputRef.current?.focus();
  };

  // Group: top-level comments first, then replies underneath their parent
  const topLevel = comments.filter(c => !c.reply_to_id);
  const replies = comments.filter(c => c.reply_to_id);

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 z-[200] bg-[#111] rounded-t-3xl border border-white/10 flex flex-col"
      style={{ bottom: 0, maxHeight: "85svh", height: "85svh" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
        <h3 className="text-white font-bold">
          Comments {comments.length > 0 && <span className="text-gray-400 font-normal text-sm">({comments.length})</span>}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Comments list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
      >
        {isLoading && (
          <p className="text-gray-500 text-center text-sm py-8">Loading comments...</p>
        )}
        {!isLoading && comments.length === 0 && (
          <p className="text-gray-500 text-center text-sm py-8">No comments yet. Be the first!</p>
        )}

        {topLevel.map((comment) => {
          const liked = comment.liked_by?.includes(currentUser?.email);
          const commentReplies = replies.filter(r => r.reply_to_id === comment.id);

          return (
            <div key={comment.id}>
              {/* Main comment */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                  {comment.author_photo ? (
                    <img src={comment.author_photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (comment.author_name?.[0] || "U").toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-white font-semibold text-sm">{comment.author_name || comment.author_email?.split("@")[0]}</span>
                      <span className="text-gray-300 text-sm ml-2">{comment.content}</span>
                    </div>
                    <button
                      onClick={() => currentUser && likeCommentMutation.mutate(comment)}
                      className="flex items-center gap-1 flex-shrink-0 pt-0.5"
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
                      {comment.likes_count > 0 && (
                        <span className="text-gray-500 text-xs">{comment.likes_count}</span>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-gray-600 text-xs">{formatLocalTime(comment.created_date)}</p>
                    {currentUser && (
                      <button
                        onClick={() => handleReply(comment)}
                        className="text-gray-500 text-xs hover:text-gray-300 transition font-medium"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {commentReplies.length > 0 && (
                <div className="ml-11 mt-2 space-y-3 border-l border-white/5 pl-3">
                  {commentReplies.map((reply) => {
                    const replyLiked = reply.liked_by?.includes(currentUser?.email);
                    return (
                      <div key={reply.id} className="flex gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                          {reply.author_photo ? (
                            <img src={reply.author_photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (reply.author_name?.[0] || "U").toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-white font-semibold text-xs">{reply.author_name || reply.author_email?.split("@")[0]}</span>
                              <span className="text-gray-300 text-xs ml-2">{reply.content}</span>
                            </div>
                            <button
                              onClick={() => currentUser && likeCommentMutation.mutate(reply)}
                              className="flex items-center gap-1 flex-shrink-0 pt-0.5"
                            >
                              <Heart className={`w-3 h-3 ${replyLiked ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
                              {reply.likes_count > 0 && (
                                <span className="text-gray-500 text-xs">{reply.likes_count}</span>
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-gray-600 text-xs">{formatLocalTime(reply.created_date)}</p>
                            {currentUser && (
                              <button
                                onClick={() => handleReply(reply)}
                                className="text-gray-500 text-xs hover:text-gray-300 transition font-medium"
                              >
                                Reply
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reply banner */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between px-4 py-2 bg-white/5 border-t border-white/10 flex-shrink-0"
          >
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <CornerDownRight className="w-3.5 h-3.5" />
              Replying to <span className="text-white font-semibold">{replyingTo.author_name}</span>
            </div>
            <button onClick={() => { setReplyingTo(null); setCommentText(""); }} className="text-gray-500 text-xs hover:text-white">
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div
        className="flex-shrink-0 px-4 pt-3 pb-5 border-t border-white/10 bg-[#111]"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
            {currentUser?.profile_picture ? (
              <img src={currentUser.profile_picture} alt="" className="w-full h-full object-cover" />
            ) : (
              (currentUser?.full_name?.[0] || "U").toUpperCase()
            )}
          </div>
          <input
            ref={inputRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={replyingTo ? `Reply to ${replyingTo.author_name}...` : "Add a comment..."}
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || addCommentMutation.isPending}
            className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-purple-700 active:scale-95 transition"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
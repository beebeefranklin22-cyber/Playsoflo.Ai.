import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Heart, Send, ChevronDown, ChevronUp, Trash2, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CommentSection({ postId, postAuthorEmail, currentUser }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({});

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => base44.entities.Comment.filter({ post_id: postId, parent_comment_id: { $exists: false } }, '-created_date'),
    enabled: !!postId
  });

  const { data: allReplies = [] } = useQuery({
    queryKey: ['replies', postId],
    queryFn: () => base44.entities.Comment.filter({ post_id: postId, parent_comment_id: { $exists: true } }, 'created_date'),
    enabled: !!postId
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data) => {
      const comment = await base44.entities.Comment.create({
        ...data,
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        author_photo: currentUser.profile_photo
      });

      // Notify post author
      if (postAuthorEmail !== currentUser.email) {
        await base44.entities.Notification.create({
          recipient_email: postAuthorEmail,
          type: data.parent_comment_id ? "comment_reply" : "new_comment",
          title: data.parent_comment_id ? "New reply to your comment" : "New comment on your post",
          message: `${currentUser.full_name} ${data.parent_comment_id ? 'replied' : 'commented'}: "${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}"`,
          reference_type: "comment",
          reference_id: comment.id,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_photo
        });
      }

      // If reply, update parent's reply count
      if (data.parent_comment_id) {
        const parentComment = comments.find(c => c.id === data.parent_comment_id);
        if (parentComment) {
          await base44.entities.Comment.update(data.parent_comment_id, {
            replies_count: (parentComment.replies_count || 0) + 1
          });
        }
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['replies', postId] });
      setNewComment("");
      setReplyContent("");
      setReplyingTo(null);
    }
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (comment) => {
      const likedBy = comment.liked_by || [];
      const isLiked = likedBy.includes(currentUser.email);
      
      const updated = await base44.entities.Comment.update(comment.id, {
        liked_by: isLiked 
          ? likedBy.filter(e => e !== currentUser.email)
          : [...likedBy, currentUser.email],
        likes_count: isLiked ? (comment.likes_count || 1) - 1 : (comment.likes_count || 0) + 1
      });

      // Notify comment author on like
      if (!isLiked && comment.author_email !== currentUser.email) {
        await base44.entities.Notification.create({
          recipient_email: comment.author_email,
          type: "comment_like",
          title: "Someone liked your comment",
          message: `${currentUser.full_name} liked your comment`,
          reference_type: "comment",
          reference_id: comment.id,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_photo
        });
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['replies', postId] });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => base44.entities.Comment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['replies', postId] });
    }
  });

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createCommentMutation.mutate({ post_id: postId, content: newComment.trim() });
  };

  const handleSubmitReply = (parentId) => {
    if (!replyContent.trim()) return;
    createCommentMutation.mutate({ 
      post_id: postId, 
      content: replyContent.trim(),
      parent_comment_id: parentId
    });
  };

  const getReplies = (commentId) => allReplies.filter(r => r.parent_comment_id === commentId);

  const CommentItem = ({ comment, isReply = false }) => {
    const replies = getReplies(comment.id);
    const isExpanded = expandedReplies[comment.id];
    const isLiked = (comment.liked_by || []).includes(currentUser?.email);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isReply ? 'ml-8 sm:ml-12 border-l-2 border-white/10 pl-4' : ''}`}
      >
        <div className="flex gap-3 py-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
            {comment.author_photo ? (
              <img src={comment.author_photo} alt="" className="w-full h-full object-cover" />
            ) : (
              comment.author_name?.[0] || "U"
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-white font-medium text-sm">{comment.author_name}</span>
                <span className="text-gray-500 text-xs ml-2">
                  {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
                </span>
              </div>

              {comment.author_email === currentUser?.email && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-white/10 rounded-full">
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem 
                      onClick={() => deleteCommentMutation.mutate(comment.id)}
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <p className="text-gray-300 text-sm mt-1 break-words">{comment.content}</p>

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => likeCommentMutation.mutate(comment)}
                className={`flex items-center gap-1 text-xs ${isLiked ? 'text-pink-400' : 'text-gray-400 hover:text-pink-400'} transition`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                {comment.likes_count || 0}
              </button>

              {!isReply && (
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-400 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  Reply
                </button>
              )}

              {!isReply && replies.length > 0 && (
                <button
                  onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>

            {/* Reply input */}
            <AnimatePresence>
              {replyingTo === comment.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3"
                >
                  <div className="flex gap-2">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="bg-white/5 border-white/10 text-white text-sm min-h-[60px] resize-none flex-1"
                    />
                    <Button
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyContent.trim() || createCommentMutation.isPending}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 self-end"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Replies */}
            <AnimatePresence>
              {isExpanded && replies.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2"
                >
                  {replies.map(reply => (
                    <CommentItem key={reply.id} comment={reply} isReply />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  };

  if (!currentUser) return null;

  return (
    <div className="border-t border-white/10 pt-4">
      {/* Comment input */}
      <form onSubmit={handleSubmitComment} className="mb-4">
        <div className="flex gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
            {currentUser.profile_photo ? (
              <img src={currentUser.profile_photo} alt="" className="w-full h-full object-cover" />
            ) : (
              currentUser.full_name?.[0] || "U"
            )}
          </div>
          <div className="flex-1 flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="bg-white/5 border-white/10 text-white text-sm min-h-[50px] resize-none flex-1"
            />
            <Button
              type="submit"
              disabled={!newComment.trim() || createCommentMutation.isPending}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </form>

      {/* Comments list */}
      <div className="space-y-1">
        {comments.length === 0 && !isLoading && (
          <p className="text-gray-500 text-sm text-center py-4">No comments yet. Be the first!</p>
        )}
        {comments.map(comment => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
}
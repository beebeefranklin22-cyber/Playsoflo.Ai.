import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Send, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function CommentSection({ postId, commentsCount, currentUser }) {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);

  const { data: comments = [] } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      return await base44.entities.Comment.filter({ post_id: postId });
    },
    enabled: showComments,
    initialData: []
  });

  const createCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      const comment = await base44.entities.Comment.create(commentData);
      
      // Update post comments count
      await base44.entities.SocialPost.update(postId, {
        comments_count: commentsCount + 1
      });

      // Get post info to notify the author
      const posts = await base44.entities.SocialPost.filter({ id: postId });
      const post = posts[0];
      
      // Notify post author (if not commenting on own post)
      if (post && post.created_by !== currentUser.email) {
        await base44.entities.Notification.create({
          recipient_email: post.created_by,
          type: "comment",
          title: "New comment on your post",
          message: `${currentUser.full_name} commented: ${commentData.content.slice(0, 50)}${commentData.content.length > 50 ? '...' : ''}`,
          reference_type: "post",
          reference_id: postId,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_photo
        });
        }

        return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['post-comments', postId]);
      queryClient.invalidateQueries(['social-feed']);
      queryClient.invalidateQueries(['social-posts']);
      setCommentText("");
      toast.success("Comment posted!");
    }
  });

  const toggleCommentLikeMutation = useMutation({
    mutationFn: async ({ commentId, liked_by, currentLikesCount }) => {
      if (!currentUser?.email) return;
      
      const likedByArray = liked_by || [];
      const isLiked = likedByArray.includes(currentUser.email);
      const newLikedBy = isLiked
        ? likedByArray.filter(email => email !== currentUser.email)
        : [...likedByArray, currentUser.email];

      return await base44.entities.Comment.update(commentId, {
        liked_by: newLikedBy,
        likes_count: isLiked ? currentLikesCount - 1 : currentLikesCount + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['post-comments', postId]);
    }
  });

  const handlePostComment = () => {
    if (!commentText.trim() || !currentUser) return;

    createCommentMutation.mutate({
      post_id: postId,
      author_email: currentUser.email,
      author_name: currentUser.full_name || currentUser.email,
      author_photo: currentUser.profile_photo,
      content: commentText,
      likes_count: 0,
      liked_by: []
    });
  };

  return (
    <div>
      <button
        onClick={() => setShowComments(!showComments)}
        className="px-4 text-gray-400 text-sm mb-2"
      >
        {commentsCount > 0 ? `View all ${commentsCount} comments` : 'Be the first to comment'}
      </button>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4"
          >
            {/* Comments List */}
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {comment.author_photo ? (
                      <img src={comment.author_photo} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white/10 rounded-2xl px-4 py-2">
                      <p className="text-white font-semibold text-sm">{comment.author_name}</p>
                      <p className="text-gray-200 text-sm">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-1 ml-2">
                      <button
                        onClick={() => {
                          if (!currentUser) {
                            toast.error("Please log in to like comments");
                            return;
                          }
                          toggleCommentLikeMutation.mutate({
                            commentId: comment.id,
                            liked_by: comment.liked_by || [],
                            currentLikesCount: comment.likes_count || 0
                          });
                        }}
                        className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1"
                      >
                        <Heart
                          className={`w-3 h-3 ${
                            comment.liked_by?.includes(currentUser?.email)
                              ? 'fill-red-500 text-red-500'
                              : ''
                          }`}
                        />
                        {comment.likes_count > 0 && comment.likes_count}
                      </button>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Comment Input */}
            <div className="flex items-center gap-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-white/10 border-white/20 text-white text-sm min-h-[40px] max-h-[80px]"
                rows={1}
              />
              <Button
                onClick={handlePostComment}
                disabled={!commentText.trim() || createCommentMutation.isPending}
                size="icon"
                className="bg-purple-600 hover:bg-purple-700 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
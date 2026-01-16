import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Send, Check, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function CommentPanel({ documentId, currentUser, onClose }) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', documentId],
    queryFn: async () => {
      const allComments = await base44.entities.DocumentComment.filter({
        document_id: documentId
      });
      return allComments.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
    },
    enabled: !!documentId
  });

  const createCommentMutation = useMutation({
    mutationFn: (data) => base44.entities.DocumentComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', documentId]);
      setNewComment('');
      setReplyTo(null);
      toast.success('Comment added');
    }
  });

  const resolveCommentMutation = useMutation({
    mutationFn: ({ id, resolved }) => 
      base44.entities.DocumentComment.update(id, {
        is_resolved: resolved,
        resolved_by: resolved ? currentUser.email : null,
        resolved_at: resolved ? new Date().toISOString() : null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', documentId]);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    createCommentMutation.mutate({
      document_id: documentId,
      author_email: currentUser.email,
      author_name: currentUser.full_name,
      content: newComment,
      parent_comment_id: replyTo?.id || null
    });
  };

  const topLevelComments = comments.filter(c => !c.parent_comment_id);
  const getReplies = (commentId) => comments.filter(c => c.parent_comment_id === commentId);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg transition"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {topLevelComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              currentUser={currentUser}
              onReply={setReplyTo}
              onResolve={resolveCommentMutation.mutate}
            />
          ))}
        </AnimatePresence>

        {comments.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No comments yet</p>
          </div>
        )}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        {replyTo && (
          <div className="mb-2 p-2 bg-purple-500/20 rounded-lg flex items-center justify-between">
            <span className="text-sm text-gray-300">
              Replying to {replyTo.author_name}
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="bg-white/5 border-white/10 text-white resize-none"
            rows={2}
          />
          <Button
            type="submit"
            disabled={!newComment.trim() || createCommentMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function CommentThread({ comment, replies, currentUser, onReply, onResolve }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`glass-effect rounded-lg p-3 ${comment.is_resolved ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
          {comment.author_name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-sm font-medium">{comment.author_name}</span>
            <span className="text-gray-400 text-xs">
              {new Date(comment.created_date).toLocaleString()}
            </span>
          </div>
          <p className="text-gray-300 text-sm">{comment.content}</p>
          
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => onReply(comment)}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              Reply
            </button>
            {!comment.is_resolved && (
              <button
                onClick={() => onResolve({ id: comment.id, resolved: true })}
                className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Resolve
              </button>
            )}
            {comment.is_resolved && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Resolved
              </span>
            )}
          </div>

          {/* Replies */}
          {replies.length > 0 && (
            <div className="ml-4 mt-3 space-y-2 border-l-2 border-purple-500/30 pl-3">
              {replies.map(reply => (
                <div key={reply.id} className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs">
                    {reply.author_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs font-medium">{reply.author_name}</span>
                      <span className="text-gray-400 text-xs">
                        {new Date(reply.created_date).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-xs mt-1">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
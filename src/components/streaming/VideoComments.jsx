import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, Heart, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

function formatTimestamp(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString();
}

function CommentBubble({ c, currentUser, onLike }) {
  const isOwn = currentUser?.email === c.author_email;
  const liked = c.liked_by?.includes(currentUser?.email);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 group"
    >
      {/* Avatar */}
      {c.author_avatar ? (
        <img src={c.author_avatar} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" alt="" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">
          {c.author_name?.[0]?.toUpperCase() || "?"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-bold text-xs ${isOwn ? "text-purple-400" : "text-cyan-300"}`}>
            {c.author_name || c.author_email?.split("@")[0]}
          </span>
          <span className="text-gray-600 text-[10px]">{formatTimestamp(c.created_date)}</span>
        </div>
        <p className="text-gray-200 text-sm leading-snug break-words">{c.content}</p>
      </div>
      {/* Like button */}
      <button
        onClick={() => onLike(c)}
        className={`flex-shrink-0 flex items-center gap-0.5 mt-1 transition text-xs ${liked ? "text-red-400" : "text-gray-600 opacity-0 group-hover:opacity-100"}`}
      >
        <Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-400" : ""}`} />
        {c.likes_count > 0 && <span>{c.likes_count}</span>}
      </button>
    </motion.div>
  );
}

export default function VideoComments({ contentId }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["video-comments", contentId],
    queryFn: () => base44.entities.Comment.filter({ post_id: contentId }),
    enabled: !!contentId,
    refetchInterval: 8000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!contentId) return;
    const unsub = base44.entities.Comment.subscribe((event) => {
      if (event.data?.post_id === contentId) {
        queryClient.invalidateQueries({ queryKey: ["video-comments", contentId] });
      }
    });
    return () => unsub();
  }, [contentId, queryClient]);

  const sorted = [...comments].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  // Scroll to bottom on new comments
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sorted.length]);

  const sendMutation = useMutation({
    mutationFn: () => base44.entities.Comment.create({
      post_id: contentId,
      author_email: currentUser.email,
      author_name: currentUser.username || currentUser.full_name || currentUser.email.split("@")[0],
      author_avatar: currentUser.profile_picture || "",
      content: text.trim(),
      likes_count: 0,
      liked_by: []
    }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["video-comments", contentId] });
    },
    onError: (e) => toast.error("Failed to post: " + e.message)
  });

  const likeMutation = useMutation({
    mutationFn: async (comment) => {
      const alreadyLiked = comment.liked_by?.includes(currentUser?.email);
      const newLiked = alreadyLiked
        ? (comment.liked_by || []).filter(e => e !== currentUser.email)
        : [...(comment.liked_by || []), currentUser.email];
      await base44.entities.Comment.update(comment.id, {
        likes_count: newLiked.length,
        liked_by: newLiked
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["video-comments", contentId] })
  });

  const handleSend = () => {
    if (!text.trim()) return;
    if (!currentUser) { base44.auth.redirectToLogin(); return; }
    sendMutation.mutate();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 flex-shrink-0">
        <MessageCircle className="w-4 h-4 text-purple-400" />
        <span className="text-white font-bold text-sm">Live Comments</span>
        <span className="ml-auto text-gray-500 text-xs">{comments.length}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-10">
            <MessageCircle className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">No comments yet</p>
            <p className="text-gray-700 text-xs">Be the first to comment!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {sorted.map(c => (
              <CommentBubble
                key={c.id}
                c={c}
                currentUser={currentUser}
                onLike={(c) => currentUser ? likeMutation.mutate(c) : base44.auth.redirectToLogin()}
              />
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        {currentUser ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {currentUser.full_name?.[0] || "U"}
            </div>
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Say something..."
              className="flex-1 bg-white/8 border-white/15 text-white placeholder-gray-600 h-9 text-sm"
              style={{ background: "rgba(255,255,255,0.06)" }}
              maxLength={300}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!text.trim() || sendMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 w-9 h-9 flex-shrink-0"
            >
              {sendMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="w-full py-2.5 text-center text-gray-500 hover:text-white text-xs transition border border-white/10 rounded-xl hover:bg-white/5"
          >
            Sign in to join the conversation
          </button>
        )}
      </div>
    </div>
  );
}
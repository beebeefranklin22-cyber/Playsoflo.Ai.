import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Search, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ShareToInboxModal({ isOpen, onClose, post, currentUser }) {
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(null);

  const { data: followers = [], isLoading } = useQuery({
    queryKey: ["followers-for-share", currentUser?.email],
    queryFn: async () => {
      const follows = await base44.entities.Follow.filter({ follower_email: currentUser.email });
      const emails = follows.map(f => f.following_email);
      if (emails.length === 0) return [];
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => emails.includes(u.email));
    },
    enabled: !!currentUser && isOpen,
  });

  const filtered = followers.filter(u =>
    (u.full_name || u.email).toLowerCase().includes(query.toLowerCase())
  );

  const handleSend = async (recipient) => {
    if (!currentUser || sending) return;
    setSending(recipient.email);
    try {
      // Find or create conversation
      let conversations = await base44.entities.ChatConversation.filter({
        participants: { $contains: currentUser.email }
      });
      let convo = conversations.find(c =>
        Array.isArray(c.participants) &&
        c.participants.includes(recipient.email) &&
        c.participants.length === 2
      );

      if (!convo) {
        convo = await base44.entities.ChatConversation.create({
          participants: [currentUser.email, recipient.email],
          created_by: currentUser.email,
        });
      }

      // Send the post as a message
      const shareText = post.caption
        ? `Shared a post: "${post.caption.substring(0, 80)}"`
        : "Shared a post";

      await base44.entities.ChatMessage.create({
        conversation_id: convo.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        content: shareText,
        media_url: post.image_url || null,
        message_type: "shared_post",
        shared_post_id: post.id,
      });

      toast.success(`Sent to ${recipient.full_name || recipient.email}`);
      setSending(null);
    } catch (err) {
      toast.error("Failed to send");
      setSending(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden"
          style={{ maxHeight: "70vh" }}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-white font-bold text-lg">Send to...</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Post preview */}
          {post?.image_url && (
            <div className="px-4 pt-3 flex items-center gap-3">
              <img src={post.image_url} className="w-12 h-12 rounded-xl object-cover" />
              <p className="text-gray-300 text-sm line-clamp-2 flex-1">{post.caption || "Post"}</p>
            </div>
          )}

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search people..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* User list */}
          <div className="overflow-y-auto px-4 pb-6 space-y-2" style={{ maxHeight: "40vh" }}>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-gray-400 text-center py-8 text-sm">
                {query ? "No users found" : "Follow people to share with them"}
              </p>
            ) : (
              filtered.map(user => (
                <div key={user.email} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden text-white font-bold text-sm flex-shrink-0">
                      {user.profile_picture
                        ? <img src={user.profile_picture} className="w-full h-full object-cover" />
                        : (user.full_name?.[0] || "U")}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{user.full_name}</p>
                      <p className="text-gray-400 text-xs">@{user.username || user.email?.split("@")[0]}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSend(user)}
                    disabled={sending === user.email}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-full text-white text-sm font-semibold transition"
                  >
                    {sending === user.email
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><Send className="w-3.5 h-3.5" /> Send</>}
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
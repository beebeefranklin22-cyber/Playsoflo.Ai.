import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RealtimeChatWindow from "./RealtimeChatWindow";

// Was its own bespoke implementation writing to `direct_messages`, keyed by
// a synthetic conversation_id derived from sorted emails (`[a,b].sort().join('_')`)
// -- but that column is a real uuid FK, so every single message send threw
// "invalid input syntax for type uuid". This now uses the same real,
// working chat_conversations/chat_messages system the main inbox
// (Messages.jsx) and BookingChatModal.jsx already use, via a find-or-create
// 1:1 conversation, so messages sent here actually show up in the
// recipient's real inbox instead of a disconnected, broken table.
export default function DirectChatModal({ isOpen, onClose, targetUser, currentUser, initialMessage }) {
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && currentUser && targetUser) initConversation();
  }, [isOpen, currentUser?.email, targetUser?.email]);

  const initConversation = async () => {
    setLoading(true);
    try {
      const existing = await base44.entities.ChatConversation.filter({});
      const found = (existing || []).find((conv) =>
        !conv.is_group &&
        Array.isArray(conv.participants) &&
        conv.participants.length === 2 &&
        conv.participants.includes(currentUser.email) &&
        conv.participants.includes(targetUser.email)
      );

      const conv = found || await base44.entities.ChatConversation.create({
        participants: [currentUser.email, targetUser.email],
        created_by: currentUser.email,
        name: targetUser.full_name || targetUser.email,
        is_group: false,
        type: "general",
        unread_count: {},
      });
      setConversation(conv);

      if (initialMessage) {
        await base44.entities.ChatMessage.create({
          conversation_id: conv.id,
          sender_email: currentUser.email,
          content: initialMessage,
          message_type: "text",
        });
        await base44.entities.ChatConversation.update(conv.id, {
          last_message: initialMessage.substring(0, 100),
          last_message_time: new Date().toISOString(),
          last_message_sender: currentUser.email,
        });
        await base44.entities.Notification.create({
          recipient_email: targetUser.email,
          type: "new_message",
          title: `New message from ${currentUser.full_name || currentUser.email}`,
          message: initialMessage.slice(0, 100),
          reference_type: "message",
          reference_id: conv.id,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          read: false,
          action_url: `/messages?conv=${conv.id}`,
        }).catch(() => {});
      }
    } catch (error) {
      console.error("Failed to init conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-gray-900 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
          style={{ height: "min(600px, 90dvh)", maxHeight: "90dvh" }}
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">{targetUser?.full_name || targetUser?.email || "User"}</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : (
              <RealtimeChatWindow conversation={conversation} currentUser={currentUser} onBack={onClose} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

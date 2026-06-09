import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Check, CheckCheck, Loader2, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

export default function DirectChatModal({ isOpen, onClose, targetUser, currentUser }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { msg, x, y }
  const [editingMsg, setEditingMsg] = useState(null); // { id, content }
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const longPressTimerRef = useRef(null);

  const conversationId = [currentUser?.email, targetUser?.email].sort().join('_');

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['direct-messages', conversationId],
    queryFn: () => base44.entities.DirectMessage.filter({ conversation_id: conversationId }, 'created_date'),
    enabled: isOpen && !!conversationId,
    refetchInterval: 2000,
  });

  const { data: targetPresence } = useQuery({
    queryKey: ['user-presence', targetUser?.email],
    queryFn: async () => {
      const presences = await base44.entities.UserPresence.filter({ user_email: targetUser?.email });
      return presences[0] || null;
    },
    enabled: isOpen && !!targetUser?.email,
    refetchInterval: 3000,
  });

  const updatePresenceMutation = useMutation({
    mutationFn: async (data) => {
      const existing = await base44.entities.UserPresence.filter({ user_email: currentUser.email });
      if (existing.length > 0) {
        return base44.entities.UserPresence.update(existing[0].id, data);
      } else {
        return base44.entities.UserPresence.create({
          user_email: currentUser.email,
          user_name: currentUser.full_name,
          user_photo: currentUser.profile_photo,
          ...data,
        });
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      const msg = await base44.entities.DirectMessage.create({
        conversation_id: conversationId,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        sender_photo: currentUser.profile_photo,
        recipient_email: targetUser.email,
        content,
        read: false,
      });
      await base44.entities.Notification.create({
        recipient_email: targetUser.email,
        type: "direct_message",
        title: `New message from ${currentUser.full_name}`,
        message: content.slice(0, 100),
        reference_type: "direct_message",
        reference_id: msg.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        sender_photo: currentUser.profile_photo,
        read: false,
      });
      return msg;
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries(['direct-messages', conversationId]);
      const previousMessages = queryClient.getQueryData(['direct-messages', conversationId]);
      queryClient.setQueryData(['direct-messages', conversationId], old => [
        ...(old || []),
        {
          id: 'temp-' + Date.now(),
          conversation_id: conversationId,
          sender_email: currentUser.email,
          content,
          created_date: new Date().toISOString(),
          read: false,
          _optimistic: true,
        },
      ]);
      return { previousMessages };
    },
    onError: (err, content, context) => {
      queryClient.setQueryData(['direct-messages', conversationId], context.previousMessages);
      toast.error("Failed to send message");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct-messages', conversationId] });
      setMessage("");
      updatePresenceMutation.mutate({ typing_to: null, typing_started: null });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (msgId) => base44.entities.DirectMessage.update(msgId, {
      content: "This message was deleted",
      is_deleted: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct-messages', conversationId] });
      toast.success("Message deleted");
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: ({ id, content }) => base44.entities.DirectMessage.update(id, {
      content,
      is_edited: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct-messages', conversationId] });
      setEditingMsg(null);
      toast.success("Message updated");
    },
  });

  const reactMutation = useMutation({
    mutationFn: async ({ msgId, emoji }) => {
      const msg = messages.find(m => m.id === msgId);
      const reactions = msg?.reactions || {};
      const users = reactions[emoji] || [];
      const hasReacted = users.includes(currentUser.email);
      return base44.entities.DirectMessage.update(msgId, {
        reactions: {
          ...reactions,
          [emoji]: hasReacted
            ? users.filter(e => e !== currentUser.email)
            : [...users, currentUser.email],
        },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['direct-messages', conversationId] }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = messages.filter(m => m.recipient_email === currentUser.email && !m.read);
      await Promise.all(unread.map(m =>
        base44.entities.DirectMessage.update(m.id, { read: true, read_at: new Date().toISOString() })
      ));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['direct-messages', conversationId] }),
  });

  useEffect(() => {
    if (isOpen && currentUser) {
      updatePresenceMutation.mutate({ status: 'online', last_seen: new Date().toISOString() });
    }
  }, [isOpen, currentUser?.email]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const hasUnread = messages.some(m => m.recipient_email === currentUser?.email && !m.read);
      if (hasUnread) markAsReadMutation.mutate();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = (value) => {
    setMessage(value);
    if (value.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        updatePresenceMutation.mutate({ typing_to: targetUser.email, typing_started: new Date().toISOString() });
      }
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        updatePresenceMutation.mutate({ typing_to: null, typing_started: null });
      }, 2000);
    } else {
      setIsTyping(false);
      updatePresenceMutation.mutate({ typing_to: null, typing_started: null });
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (editingMsg) {
      editMessageMutation.mutate({ id: editingMsg.id, content: message.trim() });
      setMessage("");
      return;
    }
    if (!message.trim()) return;
    sendMessageMutation.mutate(message.trim());
  };

  // Long-press handlers
  const startLongPress = (e, msg) => {
    if (msg._optimistic || msg.is_deleted) return;
    longPressTimerRef.current = setTimeout(() => {
      // Vibrate for haptic feedback on mobile
      if (navigator.vibrate) navigator.vibrate(40);
      const touch = e.touches?.[0] || e;
      setContextMenu({ msg, x: touch.clientX, y: touch.clientY });
    }, 500);
  };

  const cancelLongPress = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const closeContextMenu = () => setContextMenu(null);

  const isTargetTyping = targetPresence?.typing_to === currentUser?.email &&
    targetPresence?.typing_started &&
    (new Date() - new Date(targetPresence.typing_started)) < 5000;

  const getOnlineStatus = () => {
    if (!targetPresence) return 'offline';
    if (targetPresence.status === 'online' && targetPresence.last_seen) {
      const diff = new Date() - new Date(targetPresence.last_seen);
      if (diff < 60000) return 'online';
      if (diff < 300000) return 'away';
    }
    return 'offline';
  };

  const onlineStatus = getOnlineStatus();

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={() => { closeContextMenu(); onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gray-900 rounded-2xl overflow-hidden flex flex-col"
        style={{ height: 'min(600px, 85dvh)' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold overflow-hidden">
                {targetUser?.profile_photo ? (
                  <img src={targetUser.profile_photo} alt="" className="w-full h-full object-cover" />
                ) : targetUser?.full_name?.[0] || "U"}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-900 ${
                onlineStatus === 'online' ? 'bg-green-500' :
                onlineStatus === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
              }`} />
            </div>
            <div>
              <h3 className="text-white font-semibold">{targetUser?.full_name || "User"}</h3>
              <p className="text-xs text-gray-400">
                {onlineStatus === 'online' ? 'Online' :
                 onlineStatus === 'away' ? 'Away' :
                 targetPresence?.last_seen ? `Last seen ${formatDistanceToNow(new Date(targetPresence.last_seen), { addSuffix: true })}` :
                 'Offline'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" onClick={closeContextMenu}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No messages yet. Say hi! 👋</p>
            </div>
          ) : messages.map((msg) => {
            const isMine = msg.sender_email === currentUser?.email;
            const isSelected = contextMenu?.msg?.id === msg.id;
            const reactionEntries = Object.entries(msg.reactions || {}).filter(([, users]) => users.length > 0);

            return (
              <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <div
                  className={`relative max-w-[75%] select-none transition-transform ${isSelected ? 'scale-95 opacity-70' : ''}`}
                  onMouseDown={(e) => startLongPress(e, msg)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={(e) => startLongPress(e, msg)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onContextMenu={(e) => { e.preventDefault(); startLongPress(e, msg); }}
                >
                  <div className={`px-4 py-2 rounded-2xl cursor-pointer ${
                    isMine
                      ? 'bg-purple-600 text-white rounded-br-md'
                      : 'bg-white/10 text-white rounded-bl-md'
                  } ${msg.is_deleted ? 'opacity-50 italic' : ''}`}>
                    <p className="text-sm break-words">{msg.content}</p>
                    {msg.is_edited && !msg.is_deleted && (
                      <span className="text-[10px] opacity-50 ml-1">edited</span>
                    )}
                  </div>
                </div>

                {/* Reactions display */}
                {reactionEntries.length > 0 && (
                  <div className={`flex gap-1 mt-1 flex-wrap ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {reactionEntries.map(([emoji, users]) => (
                      <button
                        key={emoji}
                        onClick={() => reactMutation.mutate({ msgId: msg.id, emoji })}
                        className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition ${
                          users.includes(currentUser.email)
                            ? 'bg-purple-600/30 border-purple-500/50 text-white'
                            : 'bg-white/10 border-white/10 text-white'
                        }`}
                      >
                        {emoji} <span className="text-[10px]">{users.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                  </span>
                  {isMine && (
                    msg.read
                      ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                      : <Check className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isTargetTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
              <div className="px-4 py-2 bg-white/10 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay }} className="w-2 h-2 bg-gray-400 rounded-full" />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t border-white/10">
          {editingMsg && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-purple-600/20 border border-purple-500/30 rounded-xl">
              <Edit2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span className="text-purple-300 text-xs flex-1 truncate">Editing message</span>
              <button type="button" onClick={() => { setEditingMsg(null); setMessage(""); }}>
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder={editingMsg ? "Edit your message..." : "Type a message..."}
              className="flex-1 bg-white/10 border-white/20 text-white"
            />
            <Button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending || editMessageMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {(sendMessageMutation.isPending || editMessageMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Context Menu — Instagram-style bottom sheet */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50"
              onClick={closeContextMenu}
            />
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-[61] bg-gray-800 rounded-t-3xl p-4 pb-safe"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Quick reactions row */}
              <div className="flex justify-around mb-4 pt-2">
                {QUICK_REACTIONS.map((emoji) => {
                  const hasReacted = contextMenu.msg.reactions?.[emoji]?.includes(currentUser.email);
                  return (
                    <button
                      key={emoji}
                      onClick={() => {
                        reactMutation.mutate({ msgId: contextMenu.msg.id, emoji });
                        closeContextMenu();
                      }}
                      className={`text-2xl transition-transform active:scale-125 w-12 h-12 flex items-center justify-center rounded-full ${hasReacted ? 'bg-purple-600/30 ring-2 ring-purple-500' : 'hover:bg-white/10'}`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>

              <div className="h-px bg-white/10 mb-3" />

              {/* Message preview */}
              <p className="text-gray-400 text-xs px-1 mb-3 line-clamp-2">{contextMenu.msg.content}</p>

              {/* Actions — only for own messages */}
              {contextMenu.msg.sender_email === currentUser.email && !contextMenu.msg.is_deleted && (
                <>
                  <button
                    onClick={() => {
                      setEditingMsg({ id: contextMenu.msg.id, content: contextMenu.msg.content });
                      setMessage(contextMenu.msg.content);
                      closeContextMenu();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition text-white"
                  >
                    <Edit2 className="w-5 h-5 text-blue-400" />
                    <span className="font-medium">Edit Message</span>
                  </button>
                  <button
                    onClick={() => {
                      deleteMessageMutation.mutate(contextMenu.msg.id);
                      closeContextMenu();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition text-red-400"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="font-medium">Delete Message</span>
                  </button>
                </>
              )}

              <button
                onClick={closeContextMenu}
                className="w-full mt-2 py-3 text-gray-400 font-semibold hover:text-white transition"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
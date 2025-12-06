import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Check, CheckCheck, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export default function DirectChatModal({ 
  isOpen, 
  onClose, 
  targetUser, 
  currentUser 
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Generate conversation ID (consistent between both users)
  const conversationId = [currentUser?.email, targetUser?.email].sort().join('_');

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['direct-messages', conversationId],
    queryFn: () => base44.entities.DirectMessage.filter(
      { conversation_id: conversationId },
      'created_date'
    ),
    enabled: isOpen && !!conversationId,
    refetchInterval: 2000 // Poll every 2 seconds for real-time feel
  });

  // Fetch target user's presence
  const { data: targetPresence } = useQuery({
    queryKey: ['user-presence', targetUser?.email],
    queryFn: async () => {
      const presences = await base44.entities.UserPresence.filter({ 
        user_email: targetUser?.email 
      });
      return presences[0] || null;
    },
    enabled: isOpen && !!targetUser?.email,
    refetchInterval: 3000
  });

  // Update own presence
  const updatePresenceMutation = useMutation({
    mutationFn: async (data) => {
      const existing = await base44.entities.UserPresence.filter({ 
        user_email: currentUser.email 
      });
      if (existing.length > 0) {
        return base44.entities.UserPresence.update(existing[0].id, data);
      } else {
        return base44.entities.UserPresence.create({
          user_email: currentUser.email,
          user_name: currentUser.full_name,
          user_photo: currentUser.profile_photo,
          ...data
        });
      }
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content) => base44.entities.DirectMessage.create({
      conversation_id: conversationId,
      sender_email: currentUser.email,
      sender_name: currentUser.full_name,
      sender_photo: currentUser.profile_photo,
      recipient_email: targetUser.email,
      content
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct-messages', conversationId] });
      setMessage("");
      // Clear typing indicator
      updatePresenceMutation.mutate({ typing_to: null, typing_started: null });
    }
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadMessages = messages.filter(
        m => m.recipient_email === currentUser.email && !m.read
      );
      await Promise.all(
        unreadMessages.map(m => 
          base44.entities.DirectMessage.update(m.id, { 
            read: true, 
            read_at: new Date().toISOString() 
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct-messages', conversationId] });
    }
  });

  // Update presence when modal opens/closes
  useEffect(() => {
    if (isOpen && currentUser) {
      updatePresenceMutation.mutate({ 
        status: 'online', 
        last_seen: new Date().toISOString() 
      });
    }
  }, [isOpen, currentUser?.email]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const hasUnread = messages.some(
        m => m.recipient_email === currentUser?.email && !m.read
      );
      if (hasUnread) {
        markAsReadMutation.mutate();
      }
    }
  }, [messages, isOpen, currentUser?.email]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  const handleTyping = (value) => {
    setMessage(value);
    
    if (value.trim()) {
      // Update typing indicator
      if (!isTyping) {
        setIsTyping(true);
        updatePresenceMutation.mutate({ 
          typing_to: targetUser.email,
          typing_started: new Date().toISOString()
        });
      }
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to clear typing indicator
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
    if (!message.trim()) return;
    sendMessageMutation.mutate(message.trim());
  };

  // Check if target is typing to us
  const isTargetTyping = targetPresence?.typing_to === currentUser?.email && 
    targetPresence?.typing_started && 
    (new Date() - new Date(targetPresence.typing_started)) < 5000;

  // Get online status
  const getOnlineStatus = () => {
    if (!targetPresence) return 'offline';
    if (targetPresence.status === 'online' && targetPresence.last_seen) {
      const lastSeen = new Date(targetPresence.last_seen);
      const diff = new Date() - lastSeen;
      if (diff < 60000) return 'online'; // Less than 1 minute
      if (diff < 300000) return 'away'; // Less than 5 minutes
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
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gray-900 rounded-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold overflow-hidden">
                {targetUser?.profile_photo ? (
                  <img src={targetUser.profile_photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  targetUser?.full_name?.[0] || "U"
                )}
              </div>
              {/* Online indicator */}
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No messages yet. Say hi! 👋</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_email === currentUser?.email;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] ${isMine ? 'order-2' : ''}`}>
                    <div className={`px-4 py-2 rounded-2xl ${
                      isMine 
                        ? 'bg-purple-600 text-white rounded-br-md' 
                        : 'bg-white/10 text-white rounded-bl-md'
                    }`}>
                      <p className="text-sm break-words">{msg.content}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
                      </span>
                      {isMine && (
                        <span className="text-xs">
                          {msg.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-gray-500" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {/* Typing indicator */}
          <AnimatePresence>
            {isTargetTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-2"
              >
                <div className="px-4 py-2 bg-white/10 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-white/10 border-white/20 text-white"
            />
            <Button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
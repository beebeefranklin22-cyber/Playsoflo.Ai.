import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

export default function RideChatModal({ open, onClose, ride }) {
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Get or create conversation
  const { data: conversation } = useQuery({
    queryKey: ['ride-conversation', ride?.id],
    queryFn: async () => {
      if (!ride || !currentUser) return null;
      
      const conversations = await base44.entities.ChatConversation.filter({
        ride_id: ride.id
      });

      if (conversations.length > 0) {
        return conversations[0];
      }

      // Create new conversation
      const otherParticipant = ride.driver_email === currentUser.email 
        ? ride.created_by 
        : ride.driver_email;

      return await base44.entities.ChatConversation.create({
        ride_id: ride.id,
        participants: [currentUser.email, otherParticipant],
        unread_count: {}
      });
    },
    enabled: !!ride && !!currentUser
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', conversation?.id],
    queryFn: async () => {
      if (!conversation) return [];
      return await base44.entities.ChatMessage.filter({
        conversation_id: conversation.id
      });
    },
    enabled: !!conversation,
    refetchInterval: 3000 // Poll every 3 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      const newMessage = await base44.entities.ChatMessage.create({
        conversation_id: conversation.id,
        sender_email: currentUser.email,
        content
      });

      // Update conversation
      await base44.entities.ChatConversation.update(conversation.id, {
        last_message: content,
        last_message_time: new Date().toISOString(),
        last_message_sender: currentUser.email
      });

      // Notify other participant
      const otherParticipant = conversation.participants.find(p => p !== currentUser.email);
      await base44.entities.Notification.create({
        recipient_email: otherParticipant,
        type: "message",
        title: "New Message",
        message: `${currentUser.full_name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        reference_type: "ride",
        reference_id: ride.id
      });

      return newMessage;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries(['chat-messages', conversation?.id]);
      queryClient.invalidateQueries(['ride-conversation', ride?.id]);
    }
  });

  const handleSend = () => {
    if (message.trim() && conversation) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!ride) return null;

  const otherParticipantEmail = ride.driver_email === currentUser?.email 
    ? ride.created_by 
    : ride.driver_email;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-2xl h-[600px] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-blue-400" />
                Chat with {otherParticipantEmail?.split('@')[0]}
              </DialogTitle>
              <p className="text-gray-400 text-sm mt-1">
                Ride: {ride.pickup_address?.substring(0, 30)}...
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {messages.map((msg) => {
              const isMe = msg.sender_email === currentUser?.email;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isMe ? 'bg-blue-600' : 'bg-white/10'} rounded-2xl px-4 py-2`}>
                    <p className="text-white text-sm">{msg.content}</p>
                    <p className="text-xs text-white/60 mt-1">
                      {new Date(msg.created_date).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 bg-white/10 border-white/20 text-white"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessageMutation.isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
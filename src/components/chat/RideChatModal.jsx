import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, X, Image as ImageIcon, Clock, MapPin, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function RideChatModal({ open, onClose, ride }) {
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [attachedPhoto, setAttachedPhoto] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Message templates
  const templates = [
    { id: 1, text: "I'm arriving soon", icon: Clock },
    { id: 2, text: "I'm at the pickup location", icon: MapPin },
    { id: 3, text: "Lost item - please check vehicle", icon: AlertCircle },
    { id: 4, text: "Running 5 minutes late", icon: Clock },
  ];

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
    mutationFn: async ({ content, photoUrl }) => {
      const messageContent = photoUrl ? `📷 ${content}` : content;
      
      const newMessage = await base44.entities.ChatMessage.create({
        conversation_id: conversation.id,
        sender_email: currentUser.email,
        content: messageContent,
        attachment_url: photoUrl || null
      });

      // Update conversation
      await base44.entities.ChatConversation.update(conversation.id, {
        last_message: messageContent,
        last_message_time: new Date().toISOString(),
        last_message_sender: currentUser.email
      });

      // Real-time notification to other participant
      const otherParticipant = conversation.participants.find(p => p !== currentUser.email);
      await base44.entities.Notification.create({
        recipient_email: otherParticipant,
        type: "message",
        title: `💬 ${currentUser.full_name}`,
        message: photoUrl ? `📷 Photo: ${content.substring(0, 40)}` : content.substring(0, 60),
        reference_type: "ride",
        reference_id: ride.id
      });

      return newMessage;
    },
    onSuccess: () => {
      setMessage("");
      setAttachedPhoto(null);
      queryClient.invalidateQueries(['chat-messages', conversation?.id]);
      queryClient.invalidateQueries(['ride-conversation', ride?.id]);
    }
  });

  const handleSend = () => {
    if ((message.trim() || attachedPhoto) && conversation) {
      sendMessageMutation.mutate({ 
        content: message.trim() || "Photo attached", 
        photoUrl: attachedPhoto 
      });
    }
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Photo too large. Max 10MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachedPhoto(file_url);
      toast.success('📷 Photo attached');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const sendTemplate = (template) => {
    if (conversation) {
      sendMessageMutation.mutate({ content: template, photoUrl: null });
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
                    {msg.attachment_url && (
                      <img 
                        src={msg.attachment_url} 
                        alt="Attachment" 
                        className="rounded-lg mb-2 max-w-full h-auto cursor-pointer hover:opacity-90 transition"
                        onClick={() => window.open(msg.attachment_url, '_blank')}
                      />
                    )}
                    <p className="text-white text-sm">{msg.content?.replace('📷 ', '')}</p>
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

        {/* Quick Templates */}
        <div className="px-4 py-2 border-t border-white/10 bg-white/5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {templates.map((template) => (
              <Button
                key={template.id}
                onClick={() => sendTemplate(template.text)}
                size="sm"
                variant="outline"
                className="flex-shrink-0 bg-white/5 border-white/20 text-white hover:bg-white/10"
                disabled={sendMessageMutation.isPending}
              >
                <template.icon className="w-3 h-3 mr-2" />
                {template.text}
              </Button>
            ))}
          </div>
        </div>

        {/* Photo Preview */}
        {attachedPhoto && (
          <div className="px-4 py-2 border-t border-white/10">
            <div className="relative inline-block">
              <img src={attachedPhoto} className="h-20 rounded-lg" alt="Attachment preview" />
              <button
                onClick={() => setAttachedPhoto(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                disabled={uploadingPhoto}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="bg-white/5 border-white/20"
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
              </Button>
            </label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="flex-1 bg-white/10 border-white/20 text-white"
            />
            <Button
              onClick={handleSend}
              disabled={(!message.trim() && !attachedPhoto) || sendMessageMutation.isPending}
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
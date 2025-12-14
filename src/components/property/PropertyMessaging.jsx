import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, Clock, User, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const MESSAGE_TEMPLATES = [
  {
    id: "welcome",
    title: "Welcome Message",
    content: "Welcome! We're excited to host you. Please let us know if you need anything before your arrival."
  },
  {
    id: "checkin",
    title: "Check-in Instructions",
    content: "Check-in is at 3 PM. The key code is [CODE]. WiFi password: [PASSWORD]. Parking is available in the garage."
  },
  {
    id: "checkout",
    title: "Check-out Reminder",
    content: "Thank you for staying with us! Check-out is at 11 AM. Please leave keys in the lockbox and turn off all lights."
  },
  {
    id: "directions",
    title: "Directions",
    content: "From the airport: Take exit 5, turn left on Main St. Property is on the right side. Look for the blue building."
  },
  {
    id: "amenities",
    title: "Amenities Info",
    content: "Pool hours: 8 AM - 10 PM. Gym code: [CODE]. Free coffee in the lobby. Beach towels available at the front desk."
  }
];

export default function PropertyMessaging({ booking, currentUser, isHost = false }) {
  const qc = useQueryClient();
  const [conversationId, setConversationId] = useState(null);
  const [message, setMessage] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: conversation } = useQuery({
    queryKey: ["property-conversation", booking?.id],
    queryFn: async () => {
      if (!booking) return null;
      
      // Find existing conversation for this booking
      const conversations = await base44.entities.ChatConversation.filter({
        booking_id: booking.id
      });

      if (conversations.length > 0) {
        return conversations[0];
      }

      // Create new conversation if doesn't exist
      const newConv = await base44.entities.ChatConversation.create({
        booking_id: booking.id,
        participants: [booking.created_by, booking.provider_email],
        type: "property_booking",
        title: booking.experience_title
      });
      return newConv;
    },
    enabled: !!booking
  });

  useEffect(() => {
    if (conversation?.id) {
      setConversationId(conversation.id);
    }
  }, [conversation]);

  const { data: messages = [] } = useQuery({
    queryKey: ["property-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      return await base44.entities.ChatMessage.filter({
        conversation_id: conversationId
      });
    },
    enabled: !!conversationId,
    refetchInterval: 3000
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      return await base44.entities.ChatMessage.create({
        conversation_id: conversationId,
        sender_email: currentUser.email,
        content,
        message_type: "text"
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(["property-messages"]);
      setMessage("");
      setShowTemplates(false);
    }
  });

  const handleSend = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };

  const handleTemplate = (template) => {
    setMessage(template.content);
    setShowTemplates(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const otherParticipant = isHost ? booking?.created_by : booking?.provider_email;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Messages with {isHost ? "Guest" : "Host"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-white/5 rounded-xl p-4 mb-4 max-h-96 overflow-y-auto space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_email === currentUser.email;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      isMe
                        ? "bg-emerald-600 text-white"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isMe ? "text-emerald-200" : "text-gray-400"}`}>
                      {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {isHost && (
          <div className="mb-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full"
            >
              {showTemplates ? "Hide" : "Use"} Message Templates
            </Button>

            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {MESSAGE_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplate(template)}
                        className="text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg transition text-sm"
                      >
                        <p className="text-emerald-400 font-semibold mb-1">{template.title}</p>
                        <p className="text-gray-400 text-xs line-clamp-2">{template.content}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="bg-white/10 border-white/20 text-white resize-none"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
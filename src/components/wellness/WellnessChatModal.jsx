import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Send, MessageSquare, Loader2, AlertCircle, RotateCcw } from "lucide-react";

export default function WellnessChatModal({ service, onClose }) {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [initError, setInitError] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      initConversation(u, service);
    }).catch(() => {
      setInitError(true);
      toast.error("You need to be signed in to message a provider.");
    });
  }, []);

  // Find-or-create a conversation between this user and the provider about
  // this specific service. Was sending `participant_emails` and never
  // `created_by` -- but chat_conversations' real jsonb array column is
  // `participants`, and the chat_conversations_insert_own RLS policy
  // requires `auth.email() = created_by`. So every create silently violated
  // RLS, the conversation never actually got created, and the modal spun
  // forever with no error shown. Mirrors the working find-or-create pattern
  // in src/components/chat/DirectChatModal.jsx, scoped additionally to this
  // service_id so a customer gets a separate thread per service.
  const initConversation = async (user, svc) => {
    if (!user) return;
    setInitError(false);
    const providerEmail = svc.provider_email || svc.created_by;
    try {
      const existing = await base44.entities.ChatConversation.filter({});
      const found = (existing || []).find((conv) =>
        Array.isArray(conv.participants) &&
        conv.participants.includes(user.email) &&
        conv.participants.includes(providerEmail) &&
        conv.service_id === svc.id
      );

      const convo = found || await base44.entities.ChatConversation.create({
        participants: [user.email, providerEmail],
        created_by: user.email,
        is_group: false,
        type: "service_inquiry",
        service_id: svc.id,
        service_title: svc.title,
        provider_name: svc.provider_name,
        last_message: "",
        last_message_at: new Date().toISOString()
      });
      setConversationId(convo.id);
    } catch (err) {
      console.error("Failed to start wellness chat conversation:", err);
      setInitError(true);
      toast.error("Couldn't start the conversation. Please try again.");
    }
  };

  const { data: messages = [] } = useQuery({
    queryKey: ["wellness-chat-messages", conversationId],
    queryFn: () => base44.entities.ChatMessage.filter({ conversation_id: conversationId }, "created_date", 100),
    enabled: !!conversationId,
    refetchInterval: 3000
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (text) => {
      if (!currentUser || !conversationId) return;
      await base44.entities.ChatMessage.create({
        conversation_id: conversationId,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        content: text,
        read: false
      });
      await base44.entities.ChatConversation.update(conversationId, {
        last_message: text,
        last_message_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wellness-chat-messages", conversationId] });
      setMessage("");
    },
    onError: (err) => toast.error("Message failed to send: " + (err?.message || "please try again"))
  });

  const handleSend = () => {
    const text = message.trim();
    if (!text || sendMutation.isPending) return;
    sendMutation.mutate(text);
  };

  const providerEmail = service.provider_email || service.created_by;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-gray-900 border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col"
        style={{ height: "85vh", maxHeight: "600px" }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 p-5 border-b border-white/10 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-green-500/20 flex-shrink-0">
            {service.image_url
              ? <img src={service.image_url} alt={service.title} className="w-full h-full object-cover" />
              : <MessageSquare className="w-6 h-6 text-green-400 m-3" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold truncate">{service.provider_name || "Provider"}</h3>
            <p className="text-gray-400 text-sm truncate">{service.title}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {!conversationId && !initError && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
            </div>
          )}

          {!conversationId && initError && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-gray-300 text-sm">Couldn't start this conversation.</p>
              <button
                onClick={() => initConversation(currentUser, service)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm transition"
              >
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
            </div>
          )}

          {conversationId && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <MessageSquare className="w-12 h-12 text-green-400/40" />
              <p className="text-gray-400 text-sm">
                Start a conversation with <span className="text-white font-medium">{service.provider_name}</span> about <span className="text-green-300">{service.title}</span>
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["What's included in a session?", "Are you available this week?", "Do you offer home visits?"].map(q => (
                  <button
                    key={q}
                    onClick={() => setMessage(q)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-green-500/20 hover:text-green-300 rounded-full text-xs text-gray-300 transition border border-white/10"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => {
            const isMe = msg.sender_email === currentUser?.email;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMe
                    ? "bg-green-600 text-white rounded-br-sm"
                    : "bg-white/10 text-gray-100 rounded-bl-sm"
                }`}>
                  {!isMe && (
                    <p className="text-green-400 text-xs font-semibold mb-1">{msg.sender_name || "Provider"}</p>
                  )}
                  <p>{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? "text-green-200" : "text-gray-500"}`}>
                    {new Date(msg.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={`Message ${service.provider_name || "provider"}...`}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-green-500 text-sm"
              disabled={!conversationId}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending || !conversationId}
              className="w-12 h-12 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-2xl flex items-center justify-center transition flex-shrink-0"
            >
              {sendMutation.isPending
                ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                : <Send className="w-5 h-5 text-white" />
              }
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
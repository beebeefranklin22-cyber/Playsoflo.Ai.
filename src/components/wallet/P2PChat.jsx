import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Globe, Loader2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function P2PChat({ order, currentUser, escrow }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [translating, setTranslating] = useState({});
  const [expandedTranslations, setExpandedTranslations] = useState({});
  const messagesEndRef = useRef(null);

  // Find or create conversation
  const { data: conversation } = useQuery({
    queryKey: ['p2p-conversation', order.id],
    queryFn: async () => {
      const participants = [order.seller_email, order.buyer_email].filter(Boolean);
      const existing = await base44.entities.ChatConversation.filter({
        participants: { $all: participants }
      });

      if (existing.length > 0) {
        return existing[0];
      }

      // Create new conversation
      return await base44.entities.ChatConversation.create({
        participants,
        type: 'general',
        title: `P2P Trade: ${order.crypto_amount} ${order.crypto_currency}`,
        unread_count: {}
      });
    },
    enabled: !!order.buyer_email
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', conversation?.id],
    queryFn: async () => {
      if (!conversation) return [];
      const msgs = await base44.entities.ChatMessage.filter({
        conversation_id: conversation.id
      });
      return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!conversation,
    refetchInterval: 3000 // Poll for new messages
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, translation }) => {
      const newMessage = await base44.entities.ChatMessage.create({
        conversation_id: conversation.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        message: text,
        translation_data: translation ? JSON.stringify(translation) : null
      });

      // Update conversation
      await base44.entities.ChatConversation.update(conversation.id, {
        last_message: text,
        last_message_time: new Date().toISOString(),
        last_message_sender: currentUser.email,
        unread_count: {
          ...conversation.unread_count,
          [order.seller_email === currentUser.email ? order.buyer_email : order.seller_email]: 
            (conversation.unread_count?.[order.seller_email === currentUser.email ? order.buyer_email : order.seller_email] || 0) + 1
        }
      });

      // Notify other party
      const recipientEmail = order.seller_email === currentUser.email ? order.buyer_email : order.seller_email;
      await base44.entities.Notification.create({
        recipient_email: recipientEmail,
        type: 'message',
        title: '💬 New message in P2P trade',
        message: `${currentUser.full_name}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
        read: false,
        action_url: '/MyP2POrders'
      });

      return newMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chat-messages']);
      setMessage('');
    },
    onError: (err) => {
      toast.error('Failed to send message');
    }
  });

  const handleSend = async () => {
    if (!message.trim()) return;

    let translation = null;
    if (autoTranslate) {
      try {
        const { data } = await base44.functions.invoke('translateChatMessage', {
          message: message.trim(),
          targetLanguage: 'en'
        });
        if (data.success) {
          translation = data.translation;
        }
      } catch (error) {
        console.log('Translation failed, sending without translation');
      }
    }

    sendMessageMutation.mutate({ text: message.trim(), translation });
  };

  const translateMessage = async (messageId, messageText) => {
    setTranslating(prev => ({ ...prev, [messageId]: true }));
    try {
      const { data } = await base44.functions.invoke('translateChatMessage', {
        message: messageText,
        targetLanguage: 'en'
      });

      if (data.success) {
        setExpandedTranslations(prev => ({
          ...prev,
          [messageId]: data.translation
        }));
      }
    } catch (error) {
      toast.error('Translation failed');
    } finally {
      setTranslating(prev => ({ ...prev, [messageId]: false }));
    }
  };

  if (!conversation) {
    return (
      <div className="bg-white/5 rounded-xl p-8 text-center">
        <p className="text-gray-400">Waiting for buyer to match order...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-bold">Trade Chat</h4>
          <div className="flex items-center gap-3">
            <Badge className="bg-white/20 text-white">
              🔐 Encrypted
            </Badge>
            <button
              onClick={() => setAutoTranslate(!autoTranslate)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                autoTranslate 
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                  : 'bg-white/10 text-gray-300'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs">Auto-translate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {messages.map((msg) => {
            const isMe = msg.sender_email === currentUser.email;
            const translationData = msg.translation_data ? JSON.parse(msg.translation_data) : null;
            const expandedTranslation = expandedTranslations[msg.id];
            const showTranslation = translationData || expandedTranslation;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`rounded-2xl px-4 py-2 ${
                    isMe 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white/10 text-white border border-white/20'
                  }`}>
                    <p className="text-sm mb-1">{msg.message}</p>
                    
                    {/* Show auto-translation if available */}
                    {translationData && translationData.detected_language !== 'en' && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <p className="text-xs opacity-75 flex items-center gap-1 mb-1">
                          <Globe className="w-3 h-3" />
                          {translationData.detected_language_name} → English
                        </p>
                        <p className="text-sm italic">{translationData.translated_message}</p>
                      </div>
                    )}

                    {/* Show manual translation */}
                    {expandedTranslation && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <p className="text-xs opacity-75 flex items-center gap-1 mb-1">
                          <Globe className="w-3 h-3" />
                          {expandedTranslation.detected_language_name} → English
                        </p>
                        <p className="text-sm italic">{expandedTranslation.translated_message}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 px-2">
                    <p className="text-gray-500 text-xs">
                      {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    
                    {/* Translate button if no translation exists */}
                    {!isMe && !translationData && !expandedTranslation && (
                      <button
                        onClick={() => translateMessage(msg.id, msg.message)}
                        disabled={translating[msg.id]}
                        className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                      >
                        {translating[msg.id] ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Globe className="w-3 h-3" />
                            Translate
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={autoTranslate ? "Type in any language..." : "Type a message..."}
            className="bg-white/10 border-white/20 text-white"
          />
          <Button
            onClick={handleSend}
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
        {autoTranslate && (
          <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
            <Globe className="w-3 h-3" />
            Auto-translate enabled - messages will be translated to English
          </p>
        )}
      </div>
    </div>
  );
}
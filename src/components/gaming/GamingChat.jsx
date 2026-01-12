import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function GamingChat({ currentUser, friendEmail, onClose }) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const conversationId = [currentUser.email, friendEmail].sort().join('-');

  const { data: messages = [] } = useQuery({
    queryKey: ['gaming-chat', conversationId],
    queryFn: async () => {
      const msgs = await base44.entities.ChatMessage.filter({
        conversation_id: conversationId
      }, 'created_date', 100);
      return msgs;
    },
    refetchInterval: 3000
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text) => {
      await base44.entities.ChatMessage.create({
        conversation_id: conversationId,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        receiver_email: friendEmail,
        message: text,
        is_read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['gaming-chat', conversationId]);
      setMessage('');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-xl rounded-3xl border-2 border-purple-500/50 shadow-2xl max-w-md w-full h-[600px] flex flex-col"
      >
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
              {friendEmail[0].toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{friendEmail.split('@')[0]}</h3>
              <p className="text-xs text-gray-400">Gaming Chat</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, idx) => {
            const isMine = msg.sender_email === currentUser.email;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  isMine 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                    : 'bg-white/10 text-white'
                }`}>
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-xs opacity-70 mt-1">{new Date(msg.created_date).toLocaleTimeString()}</p>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
            <Button type="submit" disabled={!message.trim()} className="bg-purple-600 hover:bg-purple-700">
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
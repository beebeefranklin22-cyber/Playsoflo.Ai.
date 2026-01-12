import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Pin, Trash2, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function LivestreamChat({ streamId, isCreator, currentUser }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [showModMenu, setShowModMenu] = useState(null);
  const chatEndRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['livestream-chat', streamId],
    queryFn: () => base44.entities.LivestreamChat.filter({ 
      stream_id: streamId,
      is_deleted: false 
    }),
    refetchInterval: 2000,
    initialData: []
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.LivestreamChat.create({
      ...data,
      is_priority: myTicket?.chat_priority || false,
      user_badge: myTicket?.exclusive_badge || null,
      badge_color: myTicket?.badge_color || null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestream-chat', streamId] });
      setMessage("");
    }
  });

  const pinMessageMutation = useMutation({
    mutationFn: ({ id, is_pinned }) => 
      base44.asServiceRole.entities.LivestreamChat.update(id, { is_pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestream-chat', streamId] });
      toast.success('Message pinned!');
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (id) => 
      base44.asServiceRole.entities.LivestreamChat.update(id, { is_deleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestream-chat', streamId] });
      toast.success('Message deleted');
    }
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    sendMessageMutation.mutate({
      stream_id: streamId,
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email.split('@')[0],
      message: message.trim()
    });
  };

  const pinnedMessages = messages.filter(m => m.is_pinned);
  const regularMessages = messages.filter(m => !m.is_pinned);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-white font-bold flex items-center gap-2">
          Live Chat
          <span className="text-xs text-green-400 flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {messages.length} messages
          </span>
        </h3>
      </div>

      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <div className="bg-purple-500/20 border-b border-purple-500/30 p-3 space-y-2">
          {pinnedMessages.map(msg => (
            <div key={msg.id} className="flex items-start gap-2">
              <Pin className="w-4 h-4 text-purple-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <span className="text-purple-300 font-semibold text-sm">
                  {msg.user_name}:
                </span>
                <span className="text-white text-sm ml-2">{msg.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {regularMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="group relative"
            >
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {msg.user_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-300 font-semibold text-sm">
                      {msg.user_name}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(msg.created_date).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-white text-sm break-words">{msg.message}</p>
                </div>
                
                {isCreator && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setShowModMenu(showModMenu === msg.id ? null : msg.id)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {showModMenu === msg.id && (
                      <div className="absolute right-0 mt-1 bg-gray-800 rounded-lg shadow-xl border border-white/10 p-2 z-10">
                        <button
                          onClick={() => {
                            pinMessageMutation.mutate({ id: msg.id, is_pinned: true });
                            setShowModMenu(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10 rounded text-white text-sm"
                        >
                          <Pin className="w-4 h-4" />
                          Pin
                        </button>
                        <button
                          onClick={() => {
                            deleteMessageMutation.mutate(msg.id);
                            setShowModMenu(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-500/20 rounded text-red-400 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Send a message..."
            className="bg-white/10 border-white/20 text-white placeholder-gray-400"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
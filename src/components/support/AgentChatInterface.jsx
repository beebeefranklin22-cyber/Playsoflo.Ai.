import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  X, Send, Loader2, Bot, User, AlertCircle, 
  CheckCircle, Package, DollarSign, Car, MapPin
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function AgentChatInterface({ ticket, currentUser, onClose }) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [message, setMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [showInternalNote, setShowInternalNote] = useState(false);

  const { data: messages = [] } = useQuery({
    queryKey: ['support-messages', ticket.id],
    queryFn: async () => {
      const msgs = await base44.entities.SupportMessage.filter({
        ticket_id: ticket.id
      });
      return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    refetchInterval: 3000
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.SupportMessage.create({
        ticket_id: ticket.id,
        sender_email: currentUser.email,
        sender_type: 'agent',
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-messages'] });
      setMessage("");
      setInternalNote("");
      setShowInternalNote(false);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status) => {
      return await base44.entities.SupportTicket.update(ticket.id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-support-tickets'] });
      toast.success('Status updated');
    }
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate({ message: message.trim() });
  };

  const handleSendInternalNote = () => {
    if (!internalNote.trim()) return;
    sendMessageMutation.mutate({ 
      message: internalNote.trim(),
      is_internal: true
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl h-[90vh] bg-gray-900 rounded-3xl border border-white/10 flex"
      >
        {/* User Context Sidebar */}
        <div className="w-80 bg-white/5 border-r border-white/10 p-6 overflow-y-auto">
          <h3 className="text-white font-bold mb-4">User Context</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-xs mb-1">User</p>
              <p className="text-white font-medium">{ticket.user_email}</p>
            </div>

            <div>
              <p className="text-gray-400 text-xs mb-1">Ticket</p>
              <p className="text-white">#{ticket.ticket_number?.substring(0, 8)}</p>
            </div>

            <div>
              <p className="text-gray-400 text-xs mb-1">Category</p>
              <p className="text-white capitalize">{ticket.category}</p>
            </div>

            {ticket.user_context && (
              <>
                {ticket.user_context.active_rentals?.length > 0 && (
                  <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Car className="w-4 h-4 text-blue-400" />
                      <p className="text-blue-400 font-semibold text-sm">Active Rentals</p>
                    </div>
                    <p className="text-white text-sm">
                      {ticket.user_context.active_rentals.length} rental(s)
                    </p>
                  </div>
                )}

                {ticket.user_context.active_deliveries?.length > 0 && (
                  <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-green-400" />
                      <p className="text-green-400 font-semibold text-sm">Active Deliveries</p>
                    </div>
                    <p className="text-white text-sm">
                      {ticket.user_context.active_deliveries.length} delivery(ies)
                    </p>
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Account Age</span>
                    <span className="text-white">{ticket.user_context.account_age_days || 0} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Transactions</span>
                    <span className="text-white">{ticket.user_context.total_transactions || 0}</span>
                  </div>
                </div>
              </>
            )}

            <div className="pt-4 border-t border-white/10 space-y-2">
              <Button
                onClick={() => updateStatusMutation.mutate('resolved')}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={ticket.status === 'resolved'}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Resolved
              </Button>
              <Button
                onClick={() => updateStatusMutation.mutate('escalated')}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
                disabled={ticket.status === 'escalated'}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Escalate
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between border-b border-white/10">
            <div>
              <h2 className="text-white font-bold">{ticket.subject}</h2>
              <p className="text-purple-100 text-sm">Support Conversation</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${
                  msg.sender_type === 'agent' || msg.sender_type === 'ai' ? 'justify-start' : 'justify-end'
                }`}
              >
                {(msg.sender_type === 'agent' || msg.sender_type === 'ai') && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.sender_type === 'ai' ? 'bg-purple-500/20' : 'bg-blue-500/20'
                  }`}>
                    {msg.sender_type === 'ai' ? (
                      <Bot className="w-4 h-4 text-purple-400" />
                    ) : (
                      <User className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                )}
                
                <div className={`max-w-[75%] ${
                  msg.is_internal 
                    ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-200'
                    : msg.sender_type === 'user'
                    ? 'bg-white/10 text-gray-200'
                    : 'bg-purple-600 text-white'
                } rounded-2xl px-4 py-2`}>
                  {msg.is_internal && (
                    <p className="text-yellow-400 text-xs font-bold mb-1">Internal Note</p>
                  )}
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.created_date).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setShowInternalNote(!showInternalNote)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  showInternalNote 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Internal Note
              </button>
            </div>

            {showInternalNote ? (
              <div className="flex gap-2">
                <Textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Internal note (not visible to user)..."
                  className="flex-1 bg-yellow-500/10 border-yellow-500/30 text-white"
                  rows={2}
                />
                <Button
                  onClick={handleSendInternalNote}
                  disabled={!internalNote.trim()}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 bg-white/10 border-white/20 text-white"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
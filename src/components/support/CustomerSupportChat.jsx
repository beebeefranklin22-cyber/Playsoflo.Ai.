import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  X, Send, Loader2, Bot, User, Headphones, 
  CheckCircle, AlertCircle, Paperclip, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function CustomerSupportChat({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [showNewTicketForm, setShowNewTicketForm] = useState(true);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Fetch user's active ticket
  const { data: activeTickets = [] } = useQuery({
    queryKey: ['my-support-tickets', currentUser?.email],
    queryFn: async () => {
      const tickets = await base44.entities.SupportTicket.filter({
        user_email: currentUser.email,
        status: { $in: ['open', 'ai_handling', 'escalated', 'assigned'] }
      });
      return tickets.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!currentUser
  });

  // Fetch messages for current ticket
  const { data: messages = [] } = useQuery({
    queryKey: ['support-messages', currentTicket?.id],
    queryFn: async () => {
      if (!currentTicket) return [];
      const msgs = await base44.entities.SupportMessage.filter({
        ticket_id: currentTicket.id,
        is_internal: false
      });
      return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!currentTicket,
    refetchInterval: 3000
  });

  // Auto-select ticket or show form
  useEffect(() => {
    if (activeTickets.length > 0 && !currentTicket) {
      setCurrentTicket(activeTickets[0]);
      setShowNewTicketForm(false);
    }
  }, [activeTickets]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createTicketMutation = useMutation({
    mutationFn: async (data) => {
      const { ticket } = await base44.functions.invoke('createSupportTicket', data);
      return ticket;
    },
    onSuccess: (ticket) => {
      setCurrentTicket(ticket);
      setShowNewTicketForm(false);
      queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] });
      toast.success('Support ticket created!');
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.functions.invoke('sendSupportMessage', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-messages'] });
      setMessage("");
    }
  });

  const handleCreateTicket = () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    createTicketMutation.mutate({ subject, category });
  };

  const handleSendMessage = () => {
    if (!message.trim() || !currentTicket) return;
    
    sendMessageMutation.mutate({
      ticket_id: currentTicket.id,
      message: message.trim()
    });
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      sendMessageMutation.mutate({
        ticket_id: currentTicket.id,
        message: "📎 Attachment uploaded",
        attachments: [file_url]
      });
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-gradient-to-br from-gray-900 to-purple-900/50 rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ maxHeight: '600px' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold">Support Chat</h3>
              {currentTicket && (
                <p className="text-purple-100 text-xs">
                  Ticket #{currentTicket.ticket_number?.substring(0, 8)}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* New Ticket Form */}
        {showNewTicketForm ? (
          <div className="p-6 space-y-4">
            <h4 className="text-white font-semibold">Start a new support request</h4>
            
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="general">General Support</option>
              <option value="rental">Car Rental Issue</option>
              <option value="delivery">Package Delivery</option>
              <option value="payment">Payment Problem</option>
              <option value="technical">Technical Issue</option>
              <option value="account">Account Help</option>
            </select>

            <Input
              placeholder="Brief description of your issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />

            <Button
              onClick={handleCreateTicket}
              disabled={createTicketMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {createTicketMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Start Chat'
              )}
            </Button>

            {activeTickets.length > 0 && (
              <button
                onClick={() => {
                  setCurrentTicket(activeTickets[0]);
                  setShowNewTicketForm(false);
                }}
                className="w-full text-purple-300 text-sm hover:text-purple-100 transition"
              >
                Continue previous conversation
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-3">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${
                      msg.sender_email === currentUser?.email ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.sender_email !== currentUser?.email && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.sender_type === 'ai' ? 'bg-purple-500/20' : 'bg-blue-500/20'
                      }`}>
                        {msg.sender_type === 'ai' ? (
                          <Bot className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Headphones className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                    )}
                    
                    <div className={`max-w-[75%] ${
                      msg.sender_email === currentUser?.email
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-gray-200'
                    } rounded-2xl px-4 py-2`}>
                      <p className="text-sm">{msg.message}</p>
                      {msg.attachments?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs underline"
                            >
                              <Paperclip className="w-3 h-3" />
                              Attachment {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.created_date).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Status Bar */}
            {currentTicket && (
              <div className="px-4 py-2 bg-white/5 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {currentTicket.status === 'ai_handling' && (
                      <>
                        <Bot className="w-3 h-3 text-purple-400" />
                        <span className="text-purple-300">AI Assistant</span>
                      </>
                    )}
                    {currentTicket.status === 'assigned' && (
                      <>
                        <Headphones className="w-3 h-3 text-blue-400" />
                        <span className="text-blue-300">Human Agent</span>
                      </>
                    )}
                    {currentTicket.status === 'escalated' && (
                      <>
                        <AlertCircle className="w-3 h-3 text-yellow-400" />
                        <span className="text-yellow-300">Escalated</span>
                      </>
                    )}
                  </div>
                  {currentTicket.assigned_agent_email && (
                    <span className="text-gray-400">
                      Agent: {currentTicket.assigned_agent_email.split('@')[0]}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="file"
                  id="support-file"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  className="hidden"
                />
                <button
                  onClick={() => document.getElementById('support-file').click()}
                  disabled={uploading}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <Paperclip className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 bg-white/10 border-white/20 text-white"
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function MessageProviderButton({ providerEmail, providerName, currentUser, context }) {
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const conversationId = `${currentUser.email}_${providerEmail}`.split('').sort().join('');
      
      const newMessage = await base44.entities.DirectMessage.create({
        conversation_id: conversationId,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        sender_photo: currentUser.profile_photo,
        recipient_email: providerEmail,
        content: message
      });

      // Send notification to provider
      await base44.entities.Notification.create({
        recipient_email: providerEmail,
        type: 'new_message',
        title: 'New Message from Customer',
        message: `${currentUser.full_name}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        sender_photo: currentUser.profile_photo,
        reference_type: 'message'
      });

      return newMessage;
    },
    onSuccess: () => {
      toast.success('Message sent!');
      setShowModal(false);
      setMessage("");
      queryClient.invalidateQueries(['provider-messages']);
    },
    onError: () => {
      toast.error('Failed to send message');
    }
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate();
  };

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        variant="outline"
        className="bg-white/5 border-white/10 hover:bg-white/10"
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Message Provider
      </Button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Message {providerName}</h3>
                <button onClick={() => setShowModal(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {context && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-blue-300 text-sm">{context}</p>
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Your Message</label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask about availability, pricing, or any questions..."
                    className="bg-white/10 border-white/20 text-white"
                    rows={5}
                  />
                </div>

                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {sendMessageMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
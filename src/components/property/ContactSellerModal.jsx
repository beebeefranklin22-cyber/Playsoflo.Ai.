import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Loader2, Phone, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ContactSellerModal({ property, onClose }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      // Create or get conversation
      const conversations = await base44.entities.ChatConversation.filter({
        participants: { $all: [currentUser.email, property.created_by] }
      });

      let conversationId;
      if (conversations.length > 0) {
        conversationId = conversations[0].id;
      } else {
        const newConversation = await base44.entities.ChatConversation.create({
          participants: [currentUser.email, property.created_by],
          last_message: data.message,
          last_message_time: new Date().toISOString()
        });
        conversationId = newConversation.id;
      }

      // Send message
      await base44.entities.ChatMessage.create({
        conversation_id: conversationId,
        sender_email: currentUser.email,
        content: data.message,
        message_type: 'text'
      });

      // Notify seller
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: property.created_by,
        type: 'new_message',
        title: property.listing_type === 'for_sale' 
          ? `🏡 Buyer inquiry for ${property.title}` 
          : `📋 Rental application for ${property.title}`,
        message: data.message.substring(0, 100),
        reference_type: 'conversation',
        reference_id: conversationId,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        read: false
      });

      return conversationId;
    },
    onSuccess: (conversationId) => {
      toast.success('Message sent to property owner!');
      onClose();
      navigate(createPageUrl("Messages"));
    },
    onError: (error) => {
      toast.error('Failed to send message');
    }
  });

  const handleSubmit = () => {
    if (!currentUser) {
      toast.error('Please log in to contact seller');
      base44.auth.redirectToLogin();
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    sendMessageMutation.mutate({ message, phone });
  };

  const defaultMessage = property.listing_type === 'for_sale'
    ? `Hi, I'm interested in purchasing your property at ${property.location}. Is it still available?`
    : `Hi, I'm interested in applying for a lease at ${property.location}. When can we schedule a viewing?`;

  React.useEffect(() => {
    setMessage(defaultMessage);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gray-900 rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">
            {property.listing_type === 'for_sale' ? 'Contact Seller' : 'Apply for Lease'}
          </h3>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <h4 className="text-white font-semibold mb-1">{property.title}</h4>
            <p className="text-gray-400 text-sm">{property.location}</p>
            <p className="text-emerald-400 font-bold mt-2">{getPrice(property)}</p>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Your Phone Number (Optional)</label>
            <Input
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Message</label>
            <Textarea
              placeholder="Introduce yourself and express your interest..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={sendMessageMutation.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
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
        </div>
      </motion.div>
    </motion.div>
  );
}

function getPrice(property) {
  if (property.listing_type === "short_term" && property.price_per_night) {
    return `$${property.price_per_night}/night`;
  } else if (property.listing_type === "for_rent" && property.price_per_month) {
    return `$${property.price_per_month.toLocaleString()}/mo`;
  } else if (property.listing_type === "for_sale" && property.sale_price) {
    return `$${property.sale_price.toLocaleString()}`;
  }
  return "Contact for price";
}
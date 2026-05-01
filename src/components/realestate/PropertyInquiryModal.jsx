import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { X, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * PropertyInquiryModal
 * Lets any user send an inquiry / message to the property owner/landlord/agent.
 * Creates an in-app notification AND opens/creates a DirectMessage conversation.
 */
export default function PropertyInquiryModal({ property, currentUser, onClose }) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState(`Inquiry about: ${property?.title || "your property"}`);
  const [body, setBody] = useState("");
  const [phone, setPhone] = useState(currentUser?.phone || "");

  const hostEmail = property?.created_by || property?.host_email;

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!body.trim()) throw new Error("Please write a message");
      if (!hostEmail) throw new Error("Property host contact not available");

      const fullMessage = `${body.trim()}${phone ? `\n\nContact phone: ${phone}` : ""}`;

      // 1. In-app notification to the host
      await base44.entities.Notification.create({
        recipient_email: hostEmail,
        type: "property_inquiry",
        title: `New inquiry: ${subject}`,
        message: fullMessage,
        sender_email: currentUser?.email,
        sender_name: currentUser?.full_name,
        sender_photo: currentUser?.profile_picture,
        reference_id: property?.id,
        reference_type: "property",
        read: false,
      });

      // 2. Find or create a direct chat conversation
      const existingConvos = await base44.entities.ChatConversation.filter({
        participant_emails: { $in: [currentUser?.email] }
      }).catch(() => []);

      let conversation = existingConvos.find((c) =>
        Array.isArray(c.participant_emails) &&
        c.participant_emails.includes(currentUser?.email) &&
        c.participant_emails.includes(hostEmail)
      );

      if (!conversation) {
        conversation = await base44.entities.ChatConversation.create({
          participant_emails: [currentUser?.email, hostEmail],
          participant_names: [currentUser?.full_name, property?.host_name || "Host"],
          last_message: fullMessage,
          last_message_time: new Date().toISOString(),
          type: "direct",
        });
      }

      // 3. Send message in that conversation
      await base44.entities.ChatMessage.create({
        conversation_id: conversation.id,
        sender_email: currentUser?.email,
        sender_name: currentUser?.full_name,
        sender_photo: currentUser?.profile_picture,
        content: `📍 **${subject}**\n\n${fullMessage}`,
        type: "text",
        read: false,
      });

      return conversation.id;
    },
    onSuccess: (conversationId) => {
      toast.success("Message sent! The host will be in touch.");
      onClose();
      // Navigate to Messages to continue the conversation
      navigate(createPageUrl("Messages") + `?conversation=${conversationId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send message");
    },
  });

  if (!property) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-gray-900 rounded-3xl border border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            Send Inquiry
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400 hover:text-white transition" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Property info */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
            {property.main_image && (
              <img src={property.main_image} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" alt="" />
            )}
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{property.title}</p>
              <p className="text-gray-400 text-xs truncate">{property.location}</p>
              {property.host_name && (
                <p className="text-emerald-400 text-xs mt-0.5">Host: {property.host_name}</p>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Message *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Hi! I'm interested in this property. I'd like to know more about..."
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 resize-none text-sm"
            />
          </div>

          {/* Phone (optional) */}
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Phone Number <span className="text-gray-500">(optional)</span></label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Not logged in warning */}
          {!currentUser && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-300 text-sm">
              You must be logged in to send an inquiry.
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 border-white/20">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!currentUser) {
                  base44.auth.redirectToLogin();
                  return;
                }
                sendMutation.mutate();
              }}
              disabled={sendMutation.isPending || !body.trim()}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {sendMutation.isPending ? "Sending..." : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
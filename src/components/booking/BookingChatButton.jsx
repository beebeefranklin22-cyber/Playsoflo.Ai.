import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, X, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import DirectChatModal from "@/components/chat/DirectChatModal";
import { toast } from "sonner";

// Quick-reply templates for common pre/post booking logistics
const QUICK_REPLIES = [
  { label: "📋 Send Requirements", text: "Hi! I'd like to share some specific requirements for my booking before confirming. Can we chat?" },
  { label: "📍 Confirm Location", text: "Can you confirm the exact location/address for this booking?" },
  { label: "🕐 Adjust Time", text: "I wanted to check if there's any flexibility on the time/date for this booking." },
  { label: "👥 Group Size", text: "I may have a different group size than listed. Can we discuss the details?" },
  { label: "🎉 Special Occasion", text: "This is for a special occasion — can we discuss any custom arrangements?" },
  { label: "💬 Ask a Question", text: "I have a quick question before I finalize my booking. Are you available to chat?" },
];

export default function BookingChatButton({
  providerEmail,
  providerName,
  providerPhoto,
  currentUser,
  bookingTitle,
  bookingId,
  bookingStatus, // 'pre' | 'post' | 'confirmed'
  variant = "default", // 'default' | 'compact' | 'icon'
  className = "",
}) {
  const [showChat, setShowChat] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const openChat = async (prefillMessage = null) => {
    if (!currentUser) {
      toast.error("Please log in to message this provider.");
      return;
    }
    if (!targetUser) {
      setLoading(true);
      let user = { email: providerEmail, full_name: providerName, profile_photo: providerPhoto };
      try {
        const users = await base44.entities.User.filter({ email: providerEmail });
        if (users.length > 0) user = users[0];
      } catch {}
      setTargetUser(user);
      setLoading(false);
    }
    setShowChat(true);
    setShowQuickReplies(false);

    // If a prefill message was selected, send it after a brief delay so the modal opens first
    if (prefillMessage) {
      setTimeout(async () => {
        try {
          const conversationId = [currentUser.email, providerEmail].sort().join('_');
          await base44.entities.DirectMessage.create({
            conversation_id: conversationId,
            sender_email: currentUser.email,
            sender_name: currentUser.full_name,
            sender_photo: currentUser.profile_photo,
            recipient_email: providerEmail,
            content: bookingTitle
              ? `[Re: ${bookingTitle}] ${prefillMessage}`
              : prefillMessage,
            read: false,
          });
          // Notify provider
          await base44.entities.Notification.create({
            recipient_email: providerEmail,
            type: "direct_message",
            title: `💬 Message from ${currentUser.full_name}`,
            message: prefillMessage.slice(0, 100),
            reference_type: "booking",
            reference_id: bookingId || null,
            sender_email: currentUser.email,
            sender_name: currentUser.full_name,
            sender_photo: currentUser.profile_photo,
            read: false,
            action_url: "/ProviderHub",
          });
        } catch (e) {
          console.error("Quick reply send failed", e);
        }
      }, 500);
    }
  };

  const statusLabel = bookingStatus === 'confirmed'
    ? 'Post-booking chat'
    : 'Chat before booking';

  const statusColor = bookingStatus === 'confirmed'
    ? 'text-green-400'
    : 'text-purple-400';

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => openChat()}
          disabled={loading}
          title={`Message ${providerName}`}
          className={`p-2 rounded-full bg-white/10 hover:bg-purple-500/30 transition text-white ${className}`}
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        <AnimatePresence>
          {showChat && targetUser && (
            <DirectChatModal
              isOpen={showChat}
              onClose={() => setShowChat(false)}
              targetUser={targetUser}
              currentUser={currentUser}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <Button
          onClick={() => openChat()}
          variant="outline"
          size="sm"
          disabled={loading}
          className={`bg-white/5 border-white/10 hover:bg-purple-500/20 text-white ${className}`}
        >
          <MessageSquare className="w-4 h-4 mr-1.5" />
          Message
        </Button>
        <AnimatePresence>
          {showChat && targetUser && (
            <DirectChatModal
              isOpen={showChat}
              onClose={() => setShowChat(false)}
              targetUser={targetUser}
              currentUser={currentUser}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // Default full variant with quick-reply panel
  return (
    <>
      <div className={`relative ${className}`}>
        {/* Main button row */}
        <div className="flex gap-2">
          <Button
            onClick={() => openChat()}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-semibold"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Message Provider
          </Button>
          <Button
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            variant="outline"
            className="bg-white/5 border-white/10 hover:bg-white/10 text-white px-3"
            title="Quick message templates"
          >
            {showQuickReplies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Status hint */}
        <p className={`text-xs mt-1 ${statusColor}`}>
          <Zap className="w-3 h-3 inline mr-1" />
          {statusLabel} — get instant answers
        </p>

        {/* Quick reply panel */}
        <AnimatePresence>
          {showQuickReplies && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-hidden"
            >
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-2 font-medium">⚡ Quick messages — tap to send instantly:</p>
                <div className="grid gap-1.5">
                  {QUICK_REPLIES.map((qr, i) => (
                    <button
                      key={i}
                      onClick={() => openChat(qr.text)}
                      className="text-left text-xs text-gray-200 bg-white/5 hover:bg-purple-500/20 border border-white/10 rounded-lg px-3 py-2 transition flex items-center gap-2"
                    >
                      <Send className="w-3 h-3 text-purple-400 flex-shrink-0" />
                      {qr.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showChat && targetUser && (
          <DirectChatModal
            isOpen={showChat}
            onClose={() => setShowChat(false)}
            targetUser={targetUser}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>
    </>
  );
}
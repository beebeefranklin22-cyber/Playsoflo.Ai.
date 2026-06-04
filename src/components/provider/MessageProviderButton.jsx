import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import DirectChatModal from "@/components/chat/DirectChatModal";

export default function MessageProviderButton({ providerEmail, providerName, currentUser, context, className }) {
  const [showChat, setShowChat] = useState(false);
  const [targetUser, setTargetUser] = useState(null);

  const openChat = async () => {
    if (!currentUser) return;
    // Build a minimal user object for the chat modal
    let user = { email: providerEmail, full_name: providerName };
    try {
      const users = await base44.entities.User.filter({ email: providerEmail });
      if (users.length > 0) user = users[0];
    } catch {}
    setTargetUser(user);
    setShowChat(true);
  };

  return (
    <>
      <Button
        onClick={openChat}
        variant="outline"
        className={`bg-white/5 border-white/10 hover:bg-white/10 ${className || ''}`}
      >
        <MessageSquare className="w-4 h-4 mr-2" />
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
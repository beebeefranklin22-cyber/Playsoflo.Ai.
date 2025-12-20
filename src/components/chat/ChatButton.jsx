import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DirectChatModal from "./DirectChatModal";

export default function ChatButton({ targetUser, currentUser }) {
  const [showChat, setShowChat] = useState(false);

  if (!targetUser || !currentUser) return null;

  return (
    <>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          setShowChat(true);
        }}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <MessageCircle className="w-4 h-4" />
        Message
      </Button>

      {showChat && (
        <DirectChatModal
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          targetUser={targetUser}
          currentUser={currentUser}
        />
      )}
    </>
  );
}
import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DirectChatModal from "./DirectChatModal";

export default function ChatButton({ 
  targetUser, 
  currentUser, 
  variant = "default",
  size = "default",
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Don't show button for own profile
  if (!currentUser || !targetUser || currentUser.email === targetUser.email) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant={variant}
        size={size}
        className={`${variant === 'default' ? 'bg-white/10 hover:bg-white/20 border border-white/20' : ''} ${className}`}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Message
      </Button>

      <DirectChatModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        targetUser={targetUser}
        currentUser={currentUser}
      />
    </>
  );
}
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import DirectChatModal from "./DirectChatModal";
import { base44 } from "@/api/base44Client";

export default function MessageUserButton({ 
  recipientEmail, 
  recipientName,
  recipientPhoto,
  variant = "default",
  size = "default",
  className = "",
  iconOnly = false
}) {
  const [showChatModal, setShowChatModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const handleClick = () => {
    if (window.NativeAppBridge?.triggerHaptic) {
      window.NativeAppBridge.triggerHaptic('light');
    }
    setShowChatModal(true);
  };

  if (!currentUser || currentUser.email === recipientEmail) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        className={`gap-2 min-h-[44px] ${className}`}
      >
        <MessageCircle className="w-4 h-4" />
        {!iconOnly && <span>Message</span>}
      </Button>

      {showChatModal && (
        <DirectChatModal
          recipientEmail={recipientEmail}
          recipientName={recipientName}
          recipientPhoto={recipientPhoto}
          currentUser={currentUser}
          onClose={() => setShowChatModal(false)}
        />
      )}
    </>
  );
}
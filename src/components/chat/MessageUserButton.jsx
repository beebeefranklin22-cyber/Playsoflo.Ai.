import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

export default function MessageUserButton({ 
  recipientEmail, 
  recipientName,
  recipientPhoto,
  variant = "default",
  size = "default",
  className = "",
  iconOnly = false
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const handleClick = async () => {
    if (window.NativeAppBridge?.triggerHaptic) {
      window.NativeAppBridge.triggerHaptic('light');
    }
    // Navigate to Messages page with the recipient's email as a URL param
    // Messages page will auto-create or open the existing conversation
    navigate(`${createPageUrl("Messages")}?user=${encodeURIComponent(recipientEmail)}`);
  };

  if (!currentUser || currentUser.email === recipientEmail) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={`gap-2 min-h-[44px] ${className}`}
    >
      <MessageCircle className="w-4 h-4" />
      {!iconOnly && <span>Message</span>}
    </Button>
  );
}
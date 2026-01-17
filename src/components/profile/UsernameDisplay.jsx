import React from "react";
import { User } from "lucide-react";

export default function UsernameDisplay({ user, showAtSign = true, className = "" }) {
  if (!user) return null;
  
  const displayName = user.username || user.email?.split('@')[0] || 'User';
  
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {showAtSign && <User className="w-3 h-3 opacity-70" />}
      {displayName}
    </span>
  );
}
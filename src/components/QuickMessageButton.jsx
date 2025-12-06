import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function QuickMessageButton({ userEmail, variant = "default", size = "default" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      
      // Check if conversation already exists
      const conversations = await base44.entities.ChatConversation.list();
      const existing = conversations.find(conv => 
        conv.participants.length === 2 &&
        conv.participants.includes(currentUser.email) &&
        conv.participants.includes(userEmail)
      );

      if (existing) {
        return existing;
      }

      // Create new conversation
      return await base44.entities.ChatConversation.create({
        participants: [currentUser.email, userEmail],
        name: userEmail,
        unread_count: {}
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      navigate(createPageUrl("Messages"));
    }
  });

  return (
    <Button
      onClick={() => createConversationMutation.mutate()}
      variant={variant}
      size={size}
      disabled={createConversationMutation.isLoading}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      Message
    </Button>
  );
}
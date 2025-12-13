import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, UserCheck, UserMinus, Clock, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function AddFriendButton({ targetUser, currentUser }) {
  const queryClient = useQueryClient();
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [message, setMessage] = useState("");

  // Check if already friends
  const { data: friendship } = useQuery({
    queryKey: ['friendship-status', currentUser?.email, targetUser?.email],
    queryFn: async () => {
      const friendships = await base44.entities.Friendship.filter({ status: 'active' });
      return friendships.find(
        f => (f.user1_email === currentUser.email && f.user2_email === targetUser.email) ||
             (f.user2_email === currentUser.email && f.user1_email === targetUser.email)
      );
    },
    enabled: !!currentUser && !!targetUser
  });

  // Check for pending request
  const { data: pendingRequest } = useQuery({
    queryKey: ['friend-request-status', currentUser?.email, targetUser?.email],
    queryFn: async () => {
      const requests = await base44.entities.FriendRequest.filter({ status: 'pending' });
      return requests.find(
        r => (r.from_email === currentUser.email && r.to_email === targetUser.email) ||
             (r.to_email === currentUser.email && r.from_email === targetUser.email)
      );
    },
    enabled: !!currentUser && !!targetUser && !friendship
  });

  const sendRequestMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.FriendRequest.create({
        from_email: currentUser.email,
        to_email: targetUser.email,
        message: message.trim() || undefined,
        status: 'pending'
      });

      await base44.entities.Notification.create({
        user_email: targetUser.email,
        type: "follow_request",
        title: "New Friend Request",
        message: `${currentUser.full_name} sent you a friend request`,
        read: false,
        action_url: "/Profile?tab=friend-requests"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['friend-request-status']);
      setShowMessageInput(false);
      setMessage("");
      toast.success("Friend request sent!");
    }
  });

  const cancelRequestMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.FriendRequest.delete(pendingRequest.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['friend-request-status']);
      toast.success("Friend request cancelled");
    }
  });

  const unfriendMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Friendship.delete(friendship.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['friendship-status']);
      queryClient.invalidateQueries(['friendships']);
      toast.success("Friend removed");
    }
  });

  if (friendship) {
    return (
      <Button
        onClick={() => unfriendMutation.mutate()}
        disabled={unfriendMutation.isPending}
        variant="outline"
        className="border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/50"
      >
        {unfriendMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <>
            <UserCheck className="w-4 h-4 mr-2" />
            Friends
          </>
        )}
      </Button>
    );
  }

  if (pendingRequest) {
    const isSentByMe = pendingRequest.from_email === currentUser.email;
    
    return (
      <Button
        onClick={() => isSentByMe && cancelRequestMutation.mutate()}
        disabled={!isSentByMe || cancelRequestMutation.isPending}
        variant="outline"
        className="border-white/20 text-white"
      >
        {cancelRequestMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <>
            <Clock className="w-4 h-4 mr-2" />
            {isSentByMe ? 'Request Sent' : 'Request Pending'}
          </>
        )}
      </Button>
    );
  }

  if (showMessageInput) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="space-y-3"
      >
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a message (optional)"
          className="bg-white/10 border-white/20 text-white resize-none"
          rows={2}
        />
        <div className="flex gap-2">
          <Button
            onClick={() => sendRequestMutation.mutate()}
            disabled={sendRequestMutation.isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {sendRequestMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Request'
            )}
          </Button>
          <Button
            onClick={() => {
              setShowMessageInput(false);
              setMessage("");
            }}
            variant="outline"
            className="border-white/20 text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <Button
      onClick={() => setShowMessageInput(true)}
      className="bg-blue-600 hover:bg-blue-700"
    >
      <UserPlus className="w-4 h-4 mr-2" />
      Add Friend
    </Button>
  );
}
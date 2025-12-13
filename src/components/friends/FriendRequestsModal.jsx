import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Check, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FriendRequestsModal({ currentUser, onClose }) {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['friend-requests', currentUser?.email],
    queryFn: async () => {
      const reqs = await base44.entities.FriendRequest.filter({
        to_email: currentUser.email,
        status: 'pending'
      });

      // Fetch sender details
      const requestsWithUsers = await Promise.all(
        reqs.map(async (req) => {
          const users = await base44.entities.User.filter({ email: req.from_email });
          return { ...req, sender: users[0] };
        })
      );

      return requestsWithUsers;
    },
    enabled: !!currentUser
  });

  const acceptMutation = useMutation({
    mutationFn: async (request) => {
      // Update request status
      await base44.entities.FriendRequest.update(request.id, { status: 'accepted' });

      // Create friendship (both directions)
      await base44.entities.Friendship.create({
        user1_email: request.from_email,
        user2_email: request.to_email
      });

      // Send notification
      await base44.entities.Notification.create({
        user_email: request.from_email,
        type: "new_follower",
        title: "Friend Request Accepted",
        message: `${currentUser.full_name} accepted your friend request!`,
        read: false,
        action_url: `/UserProfile?user=${encodeURIComponent(currentUser.email)}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['friend-requests']);
      queryClient.invalidateQueries(['friendships']);
      toast.success("Friend request accepted!");
    }
  });

  const declineMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.FriendRequest.update(requestId, { status: 'declined' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['friend-requests']);
      toast.success("Friend request declined");
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] bg-gray-900 rounded-3xl overflow-hidden flex flex-col"
      >
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">Friend Requests</h2>
                <p className="text-purple-100 text-sm">
                  {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No pending friend requests</p>
              <p className="text-gray-500 text-sm">When someone sends you a friend request, it will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {requests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                        {request.sender?.full_name?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold">{request.sender?.full_name}</h3>
                        <p className="text-gray-400 text-sm">@{request.sender?.username}</p>
                        {request.message && (
                          <p className="text-gray-300 text-sm mt-2 italic">"{request.message}"</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          onClick={() => acceptMutation.mutate(request)}
                          disabled={acceptMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          {acceptMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Accept
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => declineMutation.mutate(request.id)}
                          disabled={declineMutation.isPending}
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                          size="sm"
                        >
                          {declineMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <X className="w-4 h-4 mr-1" />
                              Decline
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
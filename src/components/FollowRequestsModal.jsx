import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, UserPlus, Check, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function FollowRequestsModal({ isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['follow-requests', currentUser?.email],
    queryFn: () => base44.entities.FollowRequest.filter({ to_email: currentUser.email, status: 'pending' }),
    enabled: isOpen && !!currentUser
  });

  const handleRequestMutation = useMutation({
    mutationFn: async ({ requestId, action, fromEmail, fromName }) => {
      await base44.entities.FollowRequest.update(requestId, { status: action });
      
      if (action === 'accepted') {
        // Create follow relationship
        await base44.entities.Follow.create({
          follower_email: fromEmail,
          following_email: currentUser.email,
          follower_name: fromName || fromEmail,
          following_name: currentUser.full_name
        });

        // Send notification to requester
        await base44.entities.Notification.create({
          recipient_email: fromEmail,
          type: "follow_request_accepted",
          title: "Follow request accepted!",
          message: `${currentUser.full_name} accepted your follow request`,
          reference_type: "user",
          reference_id: currentUser.id,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_photo
        });
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['follow-requests'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      toast.success(action === 'accepted' ? 'Request accepted!' : 'Request declined');
    }
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="w-full max-w-lg bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden border border-white/20"
        >
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white">Follow Requests</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto p-4">
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(request => (
                  <div key={request.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {(request.from_email?.[0] || "U").toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{request.from_email}</p>
                      <p className="text-gray-400 text-sm">wants to follow you</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRequestMutation.mutate({ 
                          requestId: request.id, 
                          action: 'accepted',
                          fromEmail: request.from_email,
                          fromName: request.from_name
                        })}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestMutation.mutate({ 
                          requestId: request.id, 
                          action: 'declined',
                          fromEmail: request.from_email,
                          fromName: request.from_name
                        })}
                        className="bg-red-600/20 hover:bg-red-600/30 border-red-500/30"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
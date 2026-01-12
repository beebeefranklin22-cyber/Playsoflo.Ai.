import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserPlus, Check, X as XIcon, MessageCircle, Trophy, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GamingFriendsList({ currentUser, onClose, onChatWith }) {
  const [searchEmail, setSearchEmail] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: friends = [] } = useQuery({
    queryKey: ['gaming-friends', currentUser?.email],
    queryFn: async () => {
      const friendships = await base44.entities.Friendship.filter({
        $or: [
          { user1_email: currentUser.email },
          { user2_email: currentUser.email }
        ]
      });
      
      // Get recent game activity
      const friendEmails = friendships.map(f => 
        f.user1_email === currentUser.email ? f.user2_email : f.user1_email
      );
      
      const activities = await Promise.all(friendEmails.map(async email => {
        const scores = await base44.entities.GameScore.filter({ user_email: email }, '-created_date', 1);
        return { email, lastActivity: scores[0] };
      }));
      
      return activities;
    },
    enabled: !!currentUser
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['gaming-friend-requests', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.FriendRequest.filter({
        to_email: currentUser.email,
        status: 'pending'
      });
    },
    enabled: !!currentUser
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (email) => {
      await base44.entities.FriendRequest.create({
        from_email: currentUser.email,
        from_name: currentUser.full_name,
        to_email: email,
        status: 'pending'
      });
    },
    onSuccess: () => {
      toast.success('Friend request sent! 🎮');
      setSearchEmail('');
    }
  });

  const acceptRequestMutation = useMutation({
    mutationFn: async (request) => {
      await base44.entities.FriendRequest.update(request.id, { status: 'accepted' });
      await base44.entities.Friendship.create({
        user1_email: request.from_email,
        user2_email: request.to_email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['gaming-friends']);
      queryClient.invalidateQueries(['gaming-friend-requests']);
      toast.success('Friend added! 🎉');
    }
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.FriendRequest.update(requestId, { status: 'rejected' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['gaming-friend-requests']);
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-xl rounded-3xl border-2 border-purple-500/50 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-purple-400" />
            <h2 className="text-3xl font-black text-white">Gaming Friends</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Add Friend */}
          <div className="mb-6">
            <p className="text-gray-300 mb-2 font-medium">Add Gaming Friend</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
              <Button 
                onClick={() => sendRequestMutation.mutate(searchEmail)}
                disabled={!searchEmail || sendRequestMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <UserPlus className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Pending Requests */}
          {requests.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-300 mb-3 font-medium">Friend Requests</p>
              <div className="space-y-2">
                {requests.map(request => (
                  <div key={request.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold">{request.from_name}</p>
                      <p className="text-gray-400 text-sm">{request.from_email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => acceptRequestMutation.mutate(request)} className="bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" onClick={() => rejectRequestMutation.mutate(request.id)} variant="destructive">
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div>
            <p className="text-gray-300 mb-3 font-medium">My Gaming Friends ({friends.length})</p>
            {friends.length === 0 ? (
              <div className="text-center py-8">
                <Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No gaming friends yet. Add some to compete!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map(friend => (
                  <motion.div
                    key={friend.email}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-xl">
                          {friend.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-bold">{friend.email.split('@')[0]}</p>
                          {friend.lastActivity && (
                            <p className="text-gray-400 text-sm">
                              🎮 {friend.lastActivity.game_name} - {friend.lastActivity.score} pts
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => navigate(createPageUrl("UserProfile") + `?email=${friend.email}`)} variant="outline">
                          <Trophy className="w-4 h-4" />
                        </Button>
                        <Button size="sm" onClick={() => onChatWith(friend.email)} className="bg-purple-600 hover:bg-purple-700">
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
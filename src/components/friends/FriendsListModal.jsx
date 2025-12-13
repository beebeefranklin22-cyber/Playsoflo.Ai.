import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Users, Search, MessageCircle, UserMinus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FriendsListModal({ currentUser, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: friendships = [], isLoading } = useQuery({
    queryKey: ['friendships', currentUser?.email],
    queryFn: async () => {
      const friendships = await base44.entities.Friendship.filter({
        status: 'active'
      });

      // Filter to get user's friendships
      const userFriendships = friendships.filter(
        f => f.user1_email === currentUser.email || f.user2_email === currentUser.email
      );

      // Get friend details
      const friendsWithDetails = await Promise.all(
        userFriendships.map(async (friendship) => {
          const friendEmail = friendship.user1_email === currentUser.email 
            ? friendship.user2_email 
            : friendship.user1_email;
          
          const users = await base44.entities.User.filter({ email: friendEmail });
          return { ...friendship, friend: users[0], friendEmail };
        })
      );

      return friendsWithDetails;
    },
    enabled: !!currentUser
  });

  const unfriendMutation = useMutation({
    mutationFn: async (friendship) => {
      await base44.entities.Friendship.delete(friendship.id);
      
      // Delete any pending requests between them
      const requests = await base44.entities.FriendRequest.filter({});
      const relevantRequests = requests.filter(
        r => (r.from_email === currentUser.email && r.to_email === friendship.friendEmail) ||
             (r.to_email === currentUser.email && r.from_email === friendship.friendEmail)
      );
      
      await Promise.all(relevantRequests.map(r => base44.entities.FriendRequest.delete(r.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['friendships']);
      toast.success("Friend removed");
    }
  });

  const filteredFriends = friendships.filter(f => 
    f.friend?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.friend?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">Friends</h2>
                <p className="text-blue-100 text-sm">{friendships.length} friends</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/60"
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">
                {searchQuery ? 'No friends found' : 'No friends yet'}
              </p>
              <p className="text-gray-500 text-sm">
                {searchQuery ? 'Try a different search' : 'Send friend requests to connect with others'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredFriends.map((friendship) => (
                  <motion.div
                    key={friendship.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition"
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => {
                          navigate(createPageUrl("UserProfile") + `?user=${encodeURIComponent(friendship.friendEmail)}`);
                          onClose();
                        }}
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                      >
                        {friendship.friend?.full_name?.[0] || "?"}
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => {
                            navigate(createPageUrl("UserProfile") + `?user=${encodeURIComponent(friendship.friendEmail)}`);
                            onClose();
                          }}
                          className="text-left"
                        >
                          <h3 className="text-white font-semibold hover:text-blue-400 transition">
                            {friendship.friend?.full_name}
                          </h3>
                          <p className="text-gray-400 text-sm">@{friendship.friend?.username}</p>
                        </button>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          onClick={() => {
                            navigate(createPageUrl("Messages") + `?chat=${encodeURIComponent(friendship.friendEmail)}`);
                            onClose();
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                        <Button
                          onClick={() => unfriendMutation.mutate(friendship)}
                          disabled={unfriendMutation.isPending}
                          variant="outline"
                          className="border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/50"
                          size="sm"
                        >
                          {unfriendMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserMinus className="w-4 h-4" />
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
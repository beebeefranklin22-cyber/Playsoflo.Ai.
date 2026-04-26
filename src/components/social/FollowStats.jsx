import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, X, UserMinus, UserX, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import FollowButton from "./FollowButton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function FollowStats({ userEmail, currentUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(null); // 'followers' | 'following' | null

  const { data: followers = [] } = useQuery({
    queryKey: ['followers', userEmail],
    queryFn: () => base44.entities.Follow.filter({ following_email: userEmail }),
    enabled: !!userEmail,
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 15000,
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', userEmail],
    queryFn: () => base44.entities.Follow.filter({ follower_email: userEmail }),
    enabled: !!userEmail,
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 15000,
  });

  const removeFollowerMutation = useMutation({
    mutationFn: async (followId) => {
      await base44.entities.Follow.delete(followId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      toast.success("Follower removed");
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: async (followId) => {
      await base44.entities.Follow.delete(followId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['is-following'] });
      toast.success("Unfollowed");
    }
  });

  const blockMutation = useMutation({
    mutationFn: async ({ email, name, followId }) => {
      // Block the user
      await base44.entities.Block.create({
        blocker_email: currentUser.email,
        blocked_email: email,
        blocker_name: currentUser.full_name || currentUser.email,
        blocked_name: name || email,
      });
      // Also unfollow if there's a follow record
      if (followId) {
        await base44.entities.Follow.delete(followId).catch(() => {});
      }
      // Remove any follow they have on us
      const theirFollows = await base44.entities.Follow.filter({
        follower_email: email,
        following_email: currentUser.email,
      });
      for (const f of theirFollows) {
        await base44.entities.Follow.delete(f.id).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['is-following'] });
      toast.success("User blocked");
    }
  });

  const UserListModal = ({ type, users, onClose }) => (
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
        className="w-full max-w-md bg-gray-900 rounded-2xl max-h-[70vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-xl font-bold text-white capitalize">{type}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
          {users.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No {type} yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {users.map((user) => {
                const email = type === 'followers' ? user.follower_email : user.following_email;
                const name = type === 'followers' ? user.follower_name : user.following_name;
                const isOwnProfile = currentUser && userEmail === currentUser.email;

                return (
                  <div key={user.id} className="flex items-center gap-2 p-4 hover:bg-white/5">
                    <button
                      onClick={() => {
                        onClose();
                        navigate(createPageUrl("UserProfile") + `?email=${encodeURIComponent(email)}`);
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {name?.[0] || "U"}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-white font-medium truncate">{name || "User"}</p>
                        <p className="text-gray-400 text-xs truncate">{email}</p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Unfollow button (only in "following" list on own profile) */}
                      {isOwnProfile && type === 'following' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unfollowMutation.mutate(user.id)}
                          disabled={unfollowMutation.isPending}
                          className="border-white/20 text-gray-300 hover:bg-white/10 text-xs px-2"
                        >
                          <UserMinus className="w-3.5 h-3.5 mr-1" /> Unfollow
                        </Button>
                      )}

                      {/* Remove follower (in "followers" list on own profile) */}
                      {isOwnProfile && type === 'followers' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFollowerMutation.mutate(user.id)}
                          disabled={removeFollowerMutation.isPending}
                          className="border-white/20 text-gray-300 hover:bg-white/10 text-xs px-2"
                        >
                          <UserMinus className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      )}

                      {/* Follow button for others */}
                      {currentUser && email !== currentUser.email && !isOwnProfile && (
                        <FollowButton targetUserEmail={email} currentUser={currentUser} />
                      )}

                      {/* Block button — always available for non-self users */}
                      {currentUser && email !== currentUser.email && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Block ${name || email}? They won't be able to see your profile.`)) {
                              blockMutation.mutate({ email, name, followId: user.id });
                            }
                          }}
                          className="text-red-400 hover:bg-red-500/10 px-2"
                          title="Block user"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <>
      <div className="flex items-center gap-6">
        <button
          onClick={() => setShowModal('followers')}
          className="text-center hover:opacity-80 transition"
        >
          <p className="text-xl font-bold text-white">{followers.length}</p>
          <p className="text-gray-400 text-xs">Followers</p>
        </button>

        <button
          onClick={() => setShowModal('following')}
          className="text-center hover:opacity-80 transition"
        >
          <p className="text-xl font-bold text-white">{following.length}</p>
          <p className="text-gray-400 text-xs">Following</p>
        </button>
      </div>

      <AnimatePresence>
        {showModal === 'followers' && (
          <UserListModal
            type="followers"
            users={followers}
            onClose={() => setShowModal(null)}
          />
        )}
        {showModal === 'following' && (
          <UserListModal
            type="following"
            users={following}
            onClose={() => setShowModal(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
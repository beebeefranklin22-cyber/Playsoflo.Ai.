import React, { useState, useEffect } from "react";
import { X, Users, User, Loader2, UserPlus, UserCheck, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

function FollowListButton({ targetEmail, targetUser, currentUser }) {
  const queryClient = useQueryClient();
  const isPrivate = targetUser?.is_private || targetUser?.privacy_settings?.is_private;

  const { data: followStatus, isLoading } = useQuery({
    queryKey: ["is-following", currentUser?.email, targetEmail],
    queryFn: async () => {
      const follows = await base44.entities.Follow.filter({
        follower_email: currentUser.email,
        following_email: targetEmail,
      });
      return follows.length > 0;
    },
    enabled: !!currentUser && !!targetEmail,
  });

  const { data: pendingRequest } = useQuery({
    queryKey: ["follow-request-pending", currentUser?.email, targetEmail],
    queryFn: async () => {
      const reqs = await base44.entities.FollowRequest.filter({
        from_email: currentUser.email,
        to_email: targetEmail,
        status: "pending",
      });
      return reqs.length > 0;
    },
    enabled: !!currentUser && !!targetEmail && !!isPrivate,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (followStatus) {
        // Unfollow
        const follows = await base44.entities.Follow.filter({
          follower_email: currentUser.email,
          following_email: targetEmail,
        });
        if (follows.length > 0) await base44.entities.Follow.delete(follows[0].id);
        return "unfollowed";
      } else if (isPrivate) {
        // Send follow request
        await base44.entities.FollowRequest.create({
          from_email: currentUser.email,
          from_name: currentUser.full_name,
          from_photo: currentUser.profile_picture || "",
          to_email: targetEmail,
          status: "pending",
        });
        await base44.entities.Notification.create({
          recipient_email: targetEmail,
          type: "follow_request",
          title: "Follow Request",
          message: `${currentUser.full_name || currentUser.email} wants to follow you`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_picture,
          read: false,
        });
        return "requested";
      } else {
        // Follow directly
        await base44.entities.Follow.create({
          follower_email: currentUser.email,
          following_email: targetEmail,
          follower_name: currentUser.full_name || currentUser.email,
          following_name: targetUser?.full_name || targetEmail,
        });
        await base44.entities.Notification.create({
          recipient_email: targetEmail,
          type: "new_follower",
          title: "New Follower",
          message: `${currentUser.full_name || currentUser.email} started following you`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_picture,
          read: false,
        });
        return "followed";
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["is-following", currentUser.email, targetEmail] });
      queryClient.invalidateQueries({ queryKey: ["follow-request-pending", currentUser.email, targetEmail] });
      queryClient.invalidateQueries({ queryKey: ["user-followers"] });
      queryClient.invalidateQueries({ queryKey: ["user-following"] });
      if (result === "unfollowed") toast.success("Unfollowed");
      else if (result === "requested") toast.success("Follow request sent");
      else toast.success("Now following");
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  if (!currentUser || currentUser.email === targetEmail) return null;
  if (isLoading) return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;

  const isPending = pendingRequest && !followStatus;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); mutation.mutate(); }}
      disabled={mutation.isPending || isPending}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
        followStatus
          ? "bg-white/10 border border-white/20 text-white hover:bg-white/20"
          : isPending
          ? "bg-yellow-600/30 border border-yellow-500/30 text-yellow-300"
          : "bg-purple-600 text-white hover:bg-purple-700"
      }`}
    >
      {mutation.isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : followStatus ? (
        <><UserCheck className="w-3.5 h-3.5" /> Following</>
      ) : isPending ? (
        <><Lock className="w-3.5 h-3.5" /> Requested</>
      ) : isPrivate ? (
        <><Lock className="w-3.5 h-3.5" /> Request</>
      ) : (
        <><UserPlus className="w-3.5 h-3.5" /> Follow</>
      )}
    </button>
  );
}

export default function FollowersModal({ isOpen, onClose, userEmail, currentUser, mode = "followers" }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(mode);

  useEffect(() => { setActiveTab(mode); }, [mode, isOpen]);

  const { data: followers = [], isLoading: loadingFollowers } = useQuery({
    queryKey: ["user-followers", userEmail],
    queryFn: async () => {
      const followData = await base44.entities.Follow.filter({ following_email: userEmail });
      const users = await base44.entities.User.list();
      return followData.map((f) => {
        const u = users.find((u) => u.email === f.follower_email);
        return { ...f, display_user: u };
      });
    },
    enabled: isOpen && !!userEmail,
  });

  const { data: following = [], isLoading: loadingFollowing } = useQuery({
    queryKey: ["user-following", userEmail],
    queryFn: async () => {
      const followData = await base44.entities.Follow.filter({ follower_email: userEmail });
      const users = await base44.entities.User.list();
      return followData.map((f) => {
        const u = users.find((u) => u.email === f.following_email);
        return { ...f, display_user: u };
      });
    },
    enabled: isOpen && !!userEmail,
  });

  if (!isOpen) return null;

  const list = activeTab === "followers" ? followers : following;
  const isLoading = activeTab === "followers" ? loadingFollowers : loadingFollowing;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden border border-white/20"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5" /> Connections
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("followers")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition text-sm ${
                activeTab === "followers" ? "bg-white text-purple-600" : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              Followers ({followers.length})
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition text-sm ${
                activeTab === "following" ? "bg-white text-purple-600" : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              Following ({following.length})
            </button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">
                {activeTab === "followers" ? "No followers yet" : "Not following anyone yet"}
              </p>
            </div>
          ) : (
            list.map((follow) => {
              const email = activeTab === "followers" ? follow.follower_email : follow.following_email;
              const user = follow.display_user;
              const name = user?.full_name || follow.follower_name || follow.following_name || email?.split("@")[0];
              const photo = user?.profile_picture;
              const username = user?.username || email?.split("@")[0];

              return (
                <div key={follow.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition">
                  <button
                    onClick={() => { navigate(createPageUrl("UserProfile") + `?user=${email}`); onClose(); }}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    {photo ? (
                      <img src={photo} className="w-11 h-11 rounded-full object-cover flex-shrink-0" alt={name} />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {(name?.[0] || "U").toUpperCase()}
                      </div>
                    )}
                    <div className="text-left min-w-0">
                      <p className="text-white font-semibold truncate">{name}</p>
                      <p className="text-gray-400 text-xs truncate">@{username}</p>
                    </div>
                  </button>

                  {currentUser && (
                    <FollowListButton
                      targetEmail={email}
                      targetUser={user}
                      currentUser={currentUser}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, UserCheck, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function FriendFinder({ isOpen, onClose, currentUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isOpen
  });

  const { data: suggestedUsers = [] } = useQuery({
    queryKey: ['suggested-users', currentUser?.email],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getSmartFriendSuggestions', {
          limit: 15
        });
        
        return response.data?.suggestions || [];
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        return [];
      }
    },
    enabled: isOpen && !!currentUser
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['pending-requests', currentUser?.email],
    queryFn: () => base44.entities.FollowRequest.filter({ from_email: currentUser.email, status: 'pending' }),
    enabled: isOpen && !!currentUser
  });

  const followMutation = useMutation({
    mutationFn: async (targetUser) => {
      const isFollowing = currentUser?.following?.includes(targetUser.email);
      
      if (isFollowing) {
        // Unfollow
        const newFollowing = currentUser.following.filter(e => e !== targetUser.email);
        await base44.auth.updateMe({ 
          following: newFollowing,
          following_count: newFollowing.length
        });
        await base44.asServiceRole.entities.User.update(targetUser.id, {
          followers_count: (targetUser.followers_count || 0) - 1
        });
        return { newFollowing, isFollowing: true, isRequest: false };
      }
      
      // Check if profile is private
      if (targetUser.is_private) {
        // Create follow request
        await base44.entities.FollowRequest.create({
          from_email: currentUser.email,
          to_email: targetUser.email,
          status: 'pending'
        });
        return { newFollowing: currentUser.following, isFollowing: false, isRequest: true };
      }
      
      // Public profile - follow directly
      const newFollowing = [...(currentUser.following || []), targetUser.email];
      await base44.auth.updateMe({ 
        following: newFollowing,
        following_count: newFollowing.length
      });
      await base44.asServiceRole.entities.User.update(targetUser.id, {
        followers_count: (targetUser.followers_count || 0) + 1
      });
      
      return { newFollowing, isFollowing: false, isRequest: false };
    },
    onSuccess: ({ isFollowing, isRequest }) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-users'] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      toast.success(
        isFollowing ? 'Unfollowed' : 
        isRequest ? 'Follow request sent' : 
        'Following!'
      );
    }
  });

  const searchResults = allUsers.filter(user => 
    user.email !== currentUser?.email &&
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
          className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden border border-white/20"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white">Find Friends</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or username..."
                className="pl-10 bg-white/5 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto p-4">
            {searchQuery ? (
              <>
                <h3 className="text-white font-semibold mb-3">Search Results</h3>
                {searchResults.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No users found</p>
                ) : (
                  <div className="space-y-3">
                    {searchResults.map(user => (
                      <UserCard
                        key={user.id}
                        user={user}
                        currentUser={currentUser}
                        pendingRequests={pendingRequests}
                        onFollow={() => followMutation.mutate(user)}
                        onViewProfile={() => {
                          navigate(createPageUrl("UserProfile") + `?username=${user.username || user.id}`);
                          onClose();
                        }}
                        isLoading={followMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="text-white font-semibold mb-3">Suggested for You</h3>
                <div className="space-y-3">
                  {suggestedUsers.map(user => (
                    <UserCard
                      key={user.id}
                      user={user}
                      currentUser={currentUser}
                      pendingRequests={pendingRequests}
                      onFollow={() => followMutation.mutate(user)}
                      onViewProfile={() => {
                        navigate(createPageUrl("UserProfile") + `?username=${user.username || user.id}`);
                        onClose();
                      }}
                      isLoading={followMutation.isPending}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function UserCard({ user, currentUser, pendingRequests, onFollow, onViewProfile, isLoading }) {
  const isFollowing = currentUser?.following?.includes(user.email);
  const hasPendingRequest = pendingRequests.some(req => req.to_email === user.email);

  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition">
      <button onClick={onViewProfile} className="flex items-center gap-3 flex-1 min-w-0">
        {user.profile_picture || user.profile_photo ? (
          <img 
            src={user.profile_picture || user.profile_photo} 
            alt={user.full_name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-white/20"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
            {(user.full_name?.[0] || "U").toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{user.full_name}</p>
          {user.username && (
            <p className="text-gray-400 text-sm truncate">@{user.username}</p>
          )}
          <div className="flex flex-col gap-1">
            <p className="text-gray-500 text-xs">{user.followers_count || 0} followers</p>
            {user.mutual_friends > 0 && (
              <p className="text-purple-400 text-xs font-semibold">
                🤝 {user.mutual_friends} mutual friend{user.mutual_friends > 1 ? 's' : ''}
              </p>
            )}
            {user.reasons && user.reasons.length > 0 && (
              <p className="text-gray-400 text-[10px]">{user.reasons[0]}</p>
            )}
          </div>
        </div>
      </button>
      
      <Button
        onClick={onFollow}
        disabled={isLoading}
        size="sm"
        className={
          isFollowing ? "bg-white/10 hover:bg-white/20" : 
          hasPendingRequest ? "bg-yellow-600/50" :
          "bg-purple-600 hover:bg-purple-700"
        }
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isFollowing ? (
          <>
            <UserCheck className="w-4 h-4 mr-1" />
            Following
          </>
        ) : hasPendingRequest ? (
          "Requested"
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-1" />
            Follow
          </>
        )}
      </Button>
    </div>
  );
}
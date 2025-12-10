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
      const users = await base44.entities.User.list();
      return users
        .filter(u => u.email !== currentUser?.email && !currentUser?.following?.includes(u.email))
        .slice(0, 10);
    },
    enabled: isOpen && !!currentUser
  });

  const followMutation = useMutation({
    mutationFn: async (userEmail) => {
      const isFollowing = currentUser?.following?.includes(userEmail);
      const newFollowing = isFollowing
        ? currentUser.following.filter(e => e !== userEmail)
        : [...(currentUser.following || []), userEmail];
      
      await base44.auth.updateMe({ 
        following: newFollowing,
        following_count: newFollowing.length
      });
      
      const targetUser = allUsers.find(u => u.email === userEmail);
      if (targetUser) {
        await base44.asServiceRole.entities.User.update(targetUser.id, {
          followers_count: (targetUser.followers_count || 0) + (isFollowing ? -1 : 1)
        });
      }
      
      return { newFollowing, isFollowing };
    },
    onSuccess: ({ newFollowing, isFollowing }) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-users'] });
      toast.success(isFollowing ? 'Unfollowed' : 'Following!');
    }
  });

  const searchResults = allUsers.filter(user => 
    user.email !== currentUser?.email &&
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
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
                        onFollow={() => followMutation.mutate(user.email)}
                        onViewProfile={() => {
                          navigate(createPageUrl("UserProfile") + `?username=${user.username || user.email}`);
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
                      onFollow={() => followMutation.mutate(user.email)}
                      onViewProfile={() => {
                        navigate(createPageUrl("UserProfile") + `?username=${user.username || user.email}`);
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

function UserCard({ user, currentUser, onFollow, onViewProfile, isLoading }) {
  const isFollowing = currentUser?.following?.includes(user.email);

  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition">
      <button onClick={onViewProfile} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
          {(user.full_name?.[0] || "U").toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{user.full_name}</p>
          {user.username && (
            <p className="text-gray-400 text-sm truncate">@{user.username}</p>
          )}
          <p className="text-gray-500 text-xs">{user.followers_count || 0} followers</p>
        </div>
      </button>
      
      <Button
        onClick={onFollow}
        disabled={isLoading}
        size="sm"
        className={isFollowing ? "bg-white/10 hover:bg-white/20" : "bg-purple-600 hover:bg-purple-700"}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isFollowing ? (
          <>
            <UserCheck className="w-4 h-4 mr-1" />
            Following
          </>
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
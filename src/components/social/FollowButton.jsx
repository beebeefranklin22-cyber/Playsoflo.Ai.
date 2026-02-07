import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FollowButton({ targetUserEmail, currentUser, isFollowing: initialFollowing = false }) {
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);

  const followMutation = useMutation({
    mutationFn: async (shouldFollow) => {
      if (shouldFollow) {
        return await base44.entities.Follow.create({
          follower_email: currentUser.email,
          following_email: targetUserEmail
        });
      } else {
        const follows = await base44.entities.Follow.filter({
          follower_email: currentUser.email,
          following_email: targetUserEmail
        });
        if (follows.length > 0) {
          await base44.entities.Follow.delete(follows[0].id);
        }
      }
    },
    onMutate: async (shouldFollow) => {
      // Optimistic update
      setIsFollowing(shouldFollow);
    },
    onError: (error, shouldFollow) => {
      // Revert on error
      setIsFollowing(!shouldFollow);
      toast.error('Failed to update follow status');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows'] });
      queryClient.invalidateQueries({ queryKey: ['my-followers'] });
    }
  });

  if (!currentUser || currentUser.email === targetUserEmail) {
    return null;
  }

  return (
    <button
      onClick={() => followMutation.mutate(!isFollowing)}
      disabled={followMutation.isPending}
      className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition ${
        isFollowing
          ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
          : 'bg-purple-600 text-white hover:bg-purple-700'
      }`}
    >
      {followMutation.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="w-4 h-4" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Follow
        </>
      )}
    </button>
  );
}
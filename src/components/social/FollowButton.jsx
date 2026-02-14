import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FollowButton({ targetUserEmail, currentUser, isFollowing: initialFollowing = false }) {
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);

  // Check actual follow status
  const { data: actualFollowing } = useQuery({
    queryKey: ['is-following', currentUser?.email, targetUserEmail],
    queryFn: async () => {
      const follows = await base44.entities.Follow.filter({
        follower_email: currentUser.email,
        following_email: targetUserEmail
      });
      return follows.length > 0;
    },
    enabled: !!currentUser && !!targetUserEmail
  });

  React.useEffect(() => {
    if (actualFollowing !== undefined) {
      setIsFollowing(actualFollowing);
    }
  }, [actualFollowing]);

  const followMutation = useMutation({
    mutationFn: async (shouldFollow) => {
      if (shouldFollow) {
        // Get target user details
        const users = await base44.entities.User.list();
        const targetUser = users.find(u => u.email === targetUserEmail);
        
        const follow = await base44.entities.Follow.create({
          follower_email: currentUser.email,
          following_email: targetUserEmail,
          follower_name: currentUser.full_name || currentUser.email,
          following_name: targetUser?.full_name || targetUserEmail
        });

        // Send notification to the followed user
        await base44.entities.Notification.create({
          recipient_email: targetUserEmail,
          type: 'new_follower',
          title: 'New Follower',
          message: `${currentUser.full_name || currentUser.email} started following you`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name,
          sender_photo: currentUser.profile_picture
        });

        return follow;
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
      console.error('Follow error:', error);
    },
    onSuccess: (data, shouldFollow) => {
      queryClient.invalidateQueries({ queryKey: ['follows'] });
      queryClient.invalidateQueries({ queryKey: ['my-followers'] });
      queryClient.invalidateQueries({ queryKey: ['user-followers'] });
      queryClient.invalidateQueries({ queryKey: ['user-following'] });
      queryClient.invalidateQueries({ queryKey: ['followers-count'] });
      queryClient.invalidateQueries({ queryKey: ['following-count'] });
      queryClient.invalidateQueries({ queryKey: ['is-following'] });
      toast.success(shouldFollow ? 'Now following' : 'Unfollowed');
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
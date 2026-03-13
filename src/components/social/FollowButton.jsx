import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FollowButton({ targetUserEmail, currentUser, isFollowing: initialFollowing = false }) {
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);

  // Check actual follow status from database
  const { data: followStatus, refetch } = useQuery({
    queryKey: ['is-following', currentUser?.email, targetUserEmail],
    queryFn: async () => {
      if (!currentUser || !targetUserEmail) return false;
      const follows = await base44.entities.Follow.filter({
        follower_email: currentUser.email,
        following_email: targetUserEmail
      });
      return follows.length > 0;
    },
    enabled: !!currentUser && !!targetUserEmail
  });

  useEffect(() => {
    if (followStatus !== undefined) {
      setIsFollowing(followStatus);
    }
  }, [followStatus]);

  const followMutation = useMutation({
    mutationFn: async (shouldFollow) => {
      console.log('Follow mutation:', shouldFollow, currentUser.email, targetUserEmail);
      
      if (shouldFollow) {
        const follow = await base44.entities.Follow.create({
          follower_email: currentUser.email,
          following_email: targetUserEmail,
          follower_name: currentUser.full_name || currentUser.email,
          following_name: targetUserEmail
        });

        console.log('Follow created:', follow);

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
        
        console.log('Unfollowing, found follows:', follows);
        
        if (follows.length > 0) {
          await base44.entities.Follow.delete(follows[0].id);
          console.log('Follow deleted');
        }
      }
    },
    onMutate: async (shouldFollow) => {
      console.log('Optimistic update:', shouldFollow);
      setIsFollowing(shouldFollow);
    },
    onError: (error, shouldFollow) => {
      console.error('Follow error:', error);
      setIsFollowing(!shouldFollow);
      toast.error('Failed to update follow status: ' + error.message);
    },
    onSuccess: (data, shouldFollow) => {
      console.log('Follow success');
      queryClient.invalidateQueries({ queryKey: ['follows'] });
      queryClient.invalidateQueries({ queryKey: ['my-followers'] });
      queryClient.invalidateQueries({ queryKey: ['user-followers'] });
      queryClient.invalidateQueries({ queryKey: ['user-following'] });
      queryClient.invalidateQueries({ queryKey: ['followers-count'] });
      queryClient.invalidateQueries({ queryKey: ['following-count'] });
      queryClient.invalidateQueries({ queryKey: ['is-following'] });
      queryClient.invalidateQueries({ queryKey: ['artist-followers-count'] });
      refetch();
      toast.success(shouldFollow ? 'Now following' : 'Unfollowed');
    }
  });

  if (!currentUser || currentUser.email === targetUserEmail) {
    return null;
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        console.log('Follow button clicked, current status:', isFollowing);
        followMutation.mutate(!isFollowing);
      }}
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
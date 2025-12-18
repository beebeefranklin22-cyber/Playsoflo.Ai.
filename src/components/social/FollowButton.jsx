import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";

export default function FollowButton({ 
  targetEmail, 
  targetName,
  currentUser,
  variant = "default",
  size = "default",
  className = ""
}) {
  const queryClient = useQueryClient();

  const { data: followStatus, isLoading } = useQuery({
    queryKey: ['follow-status', currentUser?.email, targetEmail],
    queryFn: async () => {
      if (!currentUser?.email || !targetEmail) return null;
      const follows = await base44.entities.Follow.filter({
        follower_email: currentUser.email,
        following_email: targetEmail
      });
      return follows.length > 0 ? follows[0] : null;
    },
    enabled: !!currentUser?.email && !!targetEmail && currentUser.email !== targetEmail
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const follow = await base44.entities.Follow.create({
        follower_email: currentUser.email,
        following_email: targetEmail,
        follower_name: currentUser.full_name,
        following_name: targetName
      });

      // Update follower counts
      const followerUsers = await base44.entities.User.filter({ email: currentUser.email });
      const followingUsers = await base44.entities.User.filter({ email: targetEmail });
      
      if (followerUsers.length > 0) {
        await base44.entities.User.update(followerUsers[0].id, {
          following_count: (followerUsers[0].following_count || 0) + 1
        });
      }
      
      if (followingUsers.length > 0) {
        await base44.entities.User.update(followingUsers[0].id, {
          followers_count: (followingUsers[0].followers_count || 0) + 1
        });
      }

      // Notify the user being followed
      await base44.entities.Notification.create({
        recipient_email: targetEmail,
        type: "new_follower",
        title: "New follower!",
        message: `${currentUser.full_name} started following you`,
        reference_type: "user",
        reference_id: currentUser.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        sender_photo: currentUser.profile_photo
      });

      return follow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-status'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['profile-user'] });
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (followStatus?.id) {
        await base44.entities.Follow.delete(followStatus.id);
        
        // Update follower counts
        const followerUsers = await base44.entities.User.filter({ email: currentUser.email });
        const followingUsers = await base44.entities.User.filter({ email: targetEmail });
        
        if (followerUsers.length > 0) {
          await base44.entities.User.update(followerUsers[0].id, {
            following_count: Math.max(0, (followerUsers[0].following_count || 1) - 1)
          });
        }
        
        if (followingUsers.length > 0) {
          await base44.entities.User.update(followingUsers[0].id, {
            followers_count: Math.max(0, (followingUsers[0].followers_count || 1) - 1)
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-status'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['profile-user'] });
    }
  });

  // Don't show button for own profile
  if (!currentUser || currentUser.email === targetEmail) return null;

  const isFollowing = !!followStatus;
  const isPending = followMutation.isPending || unfollowMutation.isPending;

  const handleClick = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      variant={isFollowing ? "outline" : variant}
      size={size}
      className={`${isFollowing ? 'bg-white/5 border-white/20 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400' : 'bg-purple-600 hover:bg-purple-700'} ${className}`}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="w-4 h-4 mr-2" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  );
}
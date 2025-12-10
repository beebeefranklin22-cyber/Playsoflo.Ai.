import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";

export default function UserFollowButton({ userEmail, userName, onFollowChange }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [followStatus, setFollowStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, [userEmail]);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      // Check if already following
      const follows = await base44.entities.Follow.filter({
        follower_email: user.email,
        following_email: userEmail
      });
      setFollowStatus(follows.length > 0 ? follows[0] : null);
    } catch (error) {
      console.log("Not authenticated");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || currentUser.email === userEmail) return;

    setLoading(true);
    try {
      const follow = await base44.entities.Follow.create({
        follower_email: currentUser.email,
        following_email: userEmail,
        follower_name: currentUser.full_name,
        following_name: userName || userEmail
      });

      // Send notification
      await base44.entities.Notification.create({
        recipient_email: userEmail,
        type: "new_follower",
        title: "New follower!",
        message: `${currentUser.full_name} started following you`,
        reference_type: "user",
        reference_id: currentUser.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        sender_photo: currentUser.profile_photo
      });

      setFollowStatus(follow);
      if (onFollowChange) onFollowChange(true);
    } catch (error) {
      console.error("Error following:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!followStatus?.id) return;

    setLoading(true);
    try {
      await base44.entities.Follow.delete(followStatus.id);
      setFollowStatus(null);
      if (onFollowChange) onFollowChange(false);
    } catch (error) {
      console.error("Error unfollowing:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || currentUser.email === userEmail) return null;

  const isFollowing = !!followStatus;

  return (
    <Button
      onClick={isFollowing ? handleUnfollow : handleFollow}
      disabled={loading}
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      className={isFollowing ? "bg-white/5 border-white/20 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400" : "bg-purple-600 hover:bg-purple-700"}
    >
      {loading ? (
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
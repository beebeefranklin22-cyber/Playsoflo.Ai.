import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus } from "lucide-react";

export default function UserFollowButton({ userEmail, onFollowChange }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setIsFollowing(user.following?.includes(userEmail) || false);
    } catch (error) {
      console.log("Not authenticated");
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser || currentUser.email === userEmail) return;

    setLoading(true);
    try {
      const following = currentUser.following || [];
      const newFollowing = isFollowing
        ? following.filter(email => email !== userEmail)
        : [...following, userEmail];

      await base44.auth.updateMe({ following: newFollowing });
      
      // Update the target user's followers list
      const targetUser = await base44.entities.User.filter({ email: userEmail });
      if (targetUser && targetUser.length > 0) {
        const targetFollowers = targetUser[0].followers || [];
        const newFollowers = isFollowing
          ? targetFollowers.filter(email => email !== currentUser.email)
          : [...targetFollowers, currentUser.email];
        
        await base44.entities.User.update(targetUser[0].id, { followers: newFollowers });
      }

      setIsFollowing(!isFollowing);
      if (onFollowChange) onFollowChange(!isFollowing);
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || currentUser.email === userEmail) return null;

  return (
    <Button
      onClick={handleToggleFollow}
      disabled={loading}
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      className={isFollowing ? "" : "bg-purple-600 hover:bg-purple-700"}
    >
      {isFollowing ? (
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
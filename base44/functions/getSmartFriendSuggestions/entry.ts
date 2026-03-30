import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limit = 20 } = await req.json().catch(() => ({}));

    // Get all users, friendships, and interactions
    const [allUsers, allFriendships, myFollowing, allFollowing, myLikes, allLikes] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Friendship.filter({ status: 'active' }),
      base44.entities.Follow.filter({ follower_email: user.email }),
      base44.entities.Follow.list(),
      base44.entities.VideoLike.filter({ user_email: user.email }),
      base44.entities.VideoLike.list()
    ]);

    // Get my friend emails
    const myFriendships = allFriendships.filter(
      f => f.user1_email === user.email || f.user2_email === user.email
    );
    const myFriendEmails = myFriendships.map(f => 
      f.user1_email === user.email ? f.user2_email : f.user1_email
    );

    // Get emails I'm following
    const followingEmails = myFollowing.map(f => f.following_email);

    // Get content creators I've liked
    const likedCreatorEmails = [...new Set(myLikes.map(like => like.creator_email))];

    // Score each user
    const scoredUsers = allUsers
      .filter(u => 
        u.email !== user.email && 
        !myFriendEmails.includes(u.email) &&
        u.privacy_settings?.show_in_suggestions !== false
      )
      .map(targetUser => {
        let score = 0;
        const reasons = [];
        const metadata = {};

        // 1. Friends of friends (highest priority)
        const targetFriendships = allFriendships.filter(
          f => f.user1_email === targetUser.email || f.user2_email === targetUser.email
        );
        const targetFriendEmails = targetFriendships.map(f => 
          f.user1_email === targetUser.email ? f.user2_email : f.user1_email
        );
        
        const mutualFriends = myFriendEmails.filter(email => 
          targetFriendEmails.includes(email)
        );

        if (mutualFriends.length > 0) {
          score += mutualFriends.length * 150;
          reasons.push(`${mutualFriends.length} mutual friend${mutualFriends.length > 1 ? 's' : ''}`);
          metadata.mutual_friends = mutualFriends.length;
          metadata.mutual_friend_names = allUsers
            .filter(u => mutualFriends.includes(u.email))
            .map(u => u.full_name || u.username)
            .slice(0, 3);
        }

        // 2. People followed by those I follow
        const peopleMyFollowsFollow = allFollowing.filter(f => 
          followingEmails.includes(f.follower_email) && 
          f.following_email === targetUser.email
        );
        if (peopleMyFollowsFollow.length > 0) {
          score += peopleMyFollowsFollow.length * 80;
          reasons.push(`Followed by ${peopleMyFollowsFollow.length} you follow`);
        }

        // 3. Similar interests/likes
        const targetLikes = allLikes.filter(like => like.user_email === targetUser.email);
        const targetLikedCreators = [...new Set(targetLikes.map(like => like.creator_email))];
        const sharedLikedCreators = likedCreatorEmails.filter(email => 
          targetLikedCreators.includes(email)
        );
        
        if (sharedLikedCreators.length > 0) {
          score += sharedLikedCreators.length * 60;
          reasons.push(`${sharedLikedCreators.length} shared interest${sharedLikedCreators.length > 1 ? 's' : ''}`);
        }

        // 4. User interests match
        const userInterests = targetUser.interests || [];
        const myInterests = user.interests || [];
        const sharedInterests = userInterests.filter(interest => 
          myInterests.includes(interest)
        );
        if (sharedInterests.length > 0) {
          score += sharedInterests.length * 40;
          metadata.shared_interests = sharedInterests.slice(0, 3);
        }

        // 5. Same location
        if (targetUser.location && user.location && 
            targetUser.location.toLowerCase().includes(user.location.toLowerCase())) {
          score += 25;
          reasons.push(`Near ${targetUser.location}`);
        }

        // 6. Similar roles
        if (targetUser.is_provider && user.is_provider) {
          score += 15;
          reasons.push('Also a provider');
        }
        if (targetUser.is_creator && user.is_creator) {
          score += 15;
          reasons.push('Also a creator');
        }
        if (targetUser.is_driver && user.is_driver) {
          score += 15;
          reasons.push('Also a driver');
        }

        // 7. Activity level
        const followerCount = targetUser.followers_count || 0;
        if (followerCount > 100) {
          score += 10;
          reasons.push('Popular creator');
        }

        // 8. Verified users
        if (targetUser.verification_status === 'verified') {
          score += 8;
          reasons.push('Verified');
        }

        // 9. Recent activity
        const lastActive = targetUser.last_active ? new Date(targetUser.last_active) : null;
        if (lastActive && Date.now() - lastActive.getTime() < 7 * 24 * 60 * 60 * 1000) {
          score += 5;
        }

        return {
          ...targetUser,
          score,
          reasons: reasons.slice(0, 3),
          metadata
        };
      })
      .filter(u => u.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Get follow/friendship status for each suggestion
    const suggestions = scoredUsers.map(u => ({
      user_id: u.id,
      email: u.email,
      full_name: u.full_name,
      username: u.username,
      profile_photo: u.profile_photo,
      profile_picture: u.profile_picture,
      bio: u.bio,
      location: u.location,
      followers_count: u.followers_count || 0,
      following_count: u.following_count || 0,
      verification_status: u.verification_status,
      is_creator: u.is_creator,
      is_provider: u.is_provider,
      score: u.score,
      reasons: u.reasons,
      mutual_friends: u.metadata.mutual_friends || 0,
      mutual_friend_names: u.metadata.mutual_friend_names || [],
      shared_interests: u.metadata.shared_interests || []
    }));

    return Response.json({
      suggestions,
      total: suggestions.length,
      algorithm_version: '2.0'
    });

  } catch (error) {
    console.error('Friend suggestions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
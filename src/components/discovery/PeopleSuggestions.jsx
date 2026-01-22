import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, UserPlus, Sparkles, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function PeopleSuggestions({ currentUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch all friendships for mutual friends calculation
  const { data: allFriendships = [] } = useQuery({
    queryKey: ['all-friendships'],
    queryFn: () => base44.entities.Friendship.filter({ status: 'active' })
  });

  // Smart people suggestions using backend algorithm
  const { data: suggestedPeople = [] } = useQuery({
    queryKey: ['people-suggestions', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];

      try {
        const response = await base44.functions.invoke('getSmartFriendSuggestions', {
          limit: 20
        });

        return response.data?.suggestions || [];
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        return [];
      }
    },
    enabled: !!currentUser,
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 60000
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (targetEmail) => {
      await base44.entities.FriendRequest.create({
        from_email: currentUser.email,
        to_email: targetEmail,
        status: 'pending'
      });

      // Send notification
      await base44.entities.Notification.create({
        recipient_email: targetEmail,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${currentUser.full_name || currentUser.email} sent you a friend request`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        reference_type: 'friend_request',
        action_url: '/profile'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['people-suggestions']);
      toast.success('Friend request sent!');
    }
  });

  if (!suggestedPeople.length) return null;

  return (
    <Card className="glass-effect border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          People You May Know
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestedPeople.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition group"
            >
              <button
                onClick={() => navigate(createPageUrl("UserProfile") + `?user=${encodeURIComponent(user.email)}`)}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                {user.profile_photo ? (
                  <img
                    src={user.profile_photo}
                    alt={user.full_name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {(user.full_name?.[0] || user.email[0]).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold truncate">
                      {user.full_name || user.email}
                    </p>
                    {user.verification_status === 'verified' && (
                      <Badge className="bg-blue-500/20 text-blue-400 px-1 py-0">
                        ✓
                      </Badge>
                    )}
                  </div>
                  
                  {user.username && (
                    <p className="text-gray-400 text-xs truncate">@{user.username}</p>
                  )}

                  {/* Reasons for suggestion */}
                  {user.reasons && user.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.reasons.map((reason, idx) => (
                        <Badge
                          key={idx}
                          className="bg-purple-500/10 text-purple-300 text-[10px] px-1.5 py-0"
                        >
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Mutual friend names */}
                  {user.mutual_friend_names && user.mutual_friend_names.length > 0 && (
                    <p className="text-gray-500 text-xs mt-1">
                      Friends with {user.mutual_friend_names.join(', ')}
                    </p>
                  )}
                </div>
              </button>

              <Button
                onClick={() => sendFriendRequestMutation.mutate(user.email)}
                disabled={sendFriendRequestMutation.isPending}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 flex-shrink-0"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </div>

        <Button
          onClick={() => navigate(createPageUrl("Discover"))}
          variant="outline"
          className="w-full mt-4 bg-white/5 border-white/10 hover:bg-white/10"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Discover More People
        </Button>
      </CardContent>
    </Card>
  );
}
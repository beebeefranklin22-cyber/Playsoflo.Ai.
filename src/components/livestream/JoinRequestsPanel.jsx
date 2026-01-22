import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserX, Users, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function JoinRequestsPanel({ streamId, currentUser, isCreator }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  // Fetch pending requests
  const { data: requests = [] } = useQuery({
    queryKey: ['join-requests', streamId],
    queryFn: async () => {
      return await base44.entities.CoStreamParticipant.filter({
        stream_id: streamId,
        status: 'requested'
      });
    },
    enabled: !!streamId && isCreator,
    refetchInterval: 5000 // Poll every 5 seconds
  });

  // Count active co-hosts
  const { data: activeCoHosts = [] } = useQuery({
    queryKey: ['active-cohosts', streamId],
    queryFn: async () => {
      return await base44.entities.CoStreamParticipant.filter({
        stream_id: streamId,
        status: 'accepted'
      });
    },
    enabled: !!streamId
  });

  // Fetch user details for requests
  const { data: requestUsers = {} } = useQuery({
    queryKey: ['request-users', requests],
    queryFn: async () => {
      const emails = [...new Set(requests.map(r => r.participant_email))];
      const users = await base44.entities.User.filter({
        email: { $in: emails }
      });
      return users.reduce((acc, user) => {
        acc[user.email] = user;
        return acc;
      }, {});
    },
    enabled: requests.length > 0
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.CoStreamParticipant.update(requestId, {
        status: 'accepted',
        invited_by: currentUser.email,
        joined_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['join-requests']);
      queryClient.invalidateQueries(['active-cohosts']);
      queryClient.invalidateQueries(['costream-participants']);
      toast.success('Request approved! User can now join as co-host.');
    },
    onError: () => {
      toast.error('Failed to approve request');
    }
  });

  const denyMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.CoStreamParticipant.update(requestId, {
        status: 'declined'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['join-requests']);
      toast.success('Request declined');
    },
    onError: () => {
      toast.error('Failed to deny request');
    }
  });

  if (!isCreator) return null;
  if (requests.length === 0) return null;

  const coHostLimit = 4;
  const atCapacity = activeCoHosts.length >= coHostLimit;

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-bold">Co-Host Requests</h3>
            <p className="text-sm text-gray-400">
              {requests.length} pending • {activeCoHosts.length}/{coHostLimit} active
            </p>
          </div>
        </div>
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          {requests.length}
        </Badge>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {requests.map((request) => {
                const user = requestUsers[request.participant_email];
                return (
                  <div
                    key={request.id}
                    className="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {user?.profile_picture ? (
                        <img
                          src={user.profile_picture}
                          alt={user.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                          {user?.full_name?.[0] || request.participant_email[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">
                          {user?.full_name || request.participant_email}
                        </p>
                        <p className="text-xs text-gray-400">
                          @{user?.username || request.participant_email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => approveMutation.mutate(request.id)}
                        disabled={atCapacity || approveMutation.isPending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        {atCapacity ? 'Full' : 'Approve'}
                      </Button>
                      <Button
                        onClick={() => denyMutation.mutate(request.id)}
                        disabled={denyMutation.isPending}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserX, Users, Clock, Sparkles, Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function JoinRequestsPanel({ streamId, currentUser, isCreator }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Fetch pending requests with real-time subscription
  const { data: requests = [] } = useQuery({
    queryKey: ['join-requests', streamId],
    queryFn: async () => {
      return await base44.entities.CoStreamParticipant.filter({
        stream_id: streamId,
        status: 'requested'
      });
    },
    enabled: !!streamId && isCreator
  });

  // Real-time subscription for requests
  useEffect(() => {
    if (!streamId || !isCreator) return;

    const unsubscribe = base44.entities.CoStreamParticipant.subscribe((event) => {
      if (event.data?.stream_id === streamId) {
        queryClient.invalidateQueries(['join-requests']);
        
        if (event.type === 'create' && event.data.status === 'requested') {
          toast.info('New co-host request!', {
            description: `${event.data.participant_email} wants to join`,
            action: {
              label: 'View',
              onClick: () => setExpanded(true)
            }
          });
        }
      }
    });

    return () => unsubscribe();
  }, [streamId, isCreator]);

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
      setProcessingId(requestId);
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
      queryClient.invalidateQueries(['my-costream-status']);
      setProcessingId(null);
      toast.success('✨ Co-host approved!', {
        description: 'They can now broadcast with you'
      });
    },
    onError: () => {
      setProcessingId(null);
      toast.error('Failed to approve request');
    }
  });

  const denyMutation = useMutation({
    mutationFn: async (requestId) => {
      setProcessingId(requestId);
      await base44.entities.CoStreamParticipant.update(requestId, {
        status: 'declined'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['join-requests']);
      setProcessingId(null);
      toast.success('Request declined');
    },
    onError: () => {
      setProcessingId(null);
      toast.error('Failed to deny request');
    }
  });

  if (!isCreator) return null;
  if (requests.length === 0) return null;

  const coHostLimit = 4;
  const atCapacity = activeCoHosts.length >= coHostLimit;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden shadow-2xl"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/10 transition-all group"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            className="relative w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30"
          >
            <Users className="w-6 h-6 text-white" />
            {requests.length > 0 && (
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Badge className="bg-red-500 text-white border-0 px-1.5 py-0 text-xs font-bold min-w-[20px] h-5 flex items-center justify-center">
                  {requests.length}
                </Badge>
              </motion.div>
            )}
          </motion.div>
          <div className="text-left">
            <h3 className="text-white font-bold flex items-center gap-2">
              Co-Host Requests
              {requests.length > 0 && (
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                >
                  <Bell className="w-4 h-4 text-yellow-400" />
                </motion.div>
              )}
            </h3>
            <p className="text-sm text-gray-400">
              {requests.length === 0 ? 'No pending requests' : `${requests.length} waiting`} • {activeCoHosts.length}/{coHostLimit} active
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          className="text-gray-400 group-hover:text-white transition"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
              {requests.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-400 text-sm">No pending requests</p>
                  <p className="text-gray-500 text-xs mt-1">Viewers can request to join as co-host</p>
                </motion.div>
              ) : (
                requests.map((request, index) => {
                  const user = requestUsers[request.participant_email];
                  const isProcessing = processingId === request.id;
                  
                  return (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gradient-to-r from-white/10 to-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative">
                            {user?.profile_picture ? (
                              <img
                                src={user.profile_picture}
                                alt={user.full_name}
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/30"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {user?.full_name?.[0] || request.participant_email[0].toUpperCase()}
                              </div>
                            )}
                            <motion.div
                              className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-gray-900"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <Clock className="w-3 h-3 text-gray-900" />
                            </motion.div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold truncate">
                              {user?.full_name || request.participant_email}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              @{user?.username || request.participant_email}
                            </p>
                            <p className="text-xs text-purple-400 mt-0.5">Wants to co-host</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              onClick={() => approveMutation.mutate(request.id)}
                              disabled={atCapacity || isProcessing}
                              size="sm"
                              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/20 border-0"
                            >
                              {isProcessing && approveMutation.isPending ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <Clock className="w-4 h-4" />
                                </motion.div>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  {atCapacity ? 'Full' : 'Accept'}
                                </>
                              )}
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              onClick={() => denyMutation.mutate(request.id)}
                              disabled={isProcessing}
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/20 border border-red-500/20"
                            >
                              {isProcessing && denyMutation.isPending ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <Clock className="w-4 h-4" />
                                </motion.div>
                              ) : (
                                <UserX className="w-4 h-4" />
                              )}
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.4);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.6);
        }
      `}</style>
    </motion.div>
  );
}
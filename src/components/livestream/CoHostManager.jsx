import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, CheckCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CoHostManager({ streamId, currentUser, isCreator }) {
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [coHostEmail, setCoHostEmail] = useState("");

  const { data: coHosts = [] } = useQuery({
    queryKey: ['co-hosts', streamId],
    queryFn: async () => {
      return await base44.entities.CoStreamParticipant.filter({ 
        stream_id: streamId,
        status: { $in: ['invited', 'accepted'] }
      });
    },
    enabled: !!streamId,
    refetchInterval: 3000,
    initialData: []
  });

  // Real-time subscription for instant co-host updates
  useEffect(() => {
    if (!streamId) return;

    const unsubscribe = base44.entities.CoStreamParticipant.subscribe((event) => {
      if (event.data?.stream_id === streamId) {
        queryClient.invalidateQueries(['co-hosts', streamId]);
      }
    });

    return () => unsubscribe();
  }, [streamId, queryClient]);

  const inviteMutation = useMutation({
    mutationFn: async (email) => {
      // Check if already invited or active
      const existing = await base44.entities.CoStreamParticipant.filter({
        stream_id: streamId,
        participant_email: email
      });
      
      if (existing.length > 0) {
        throw new Error('This user is already invited or co-hosting');
      }

      // Send notification to the invited user
      await base44.entities.Notification.create({
        recipient_email: email,
        type: 'message',
        title: 'Co-Host Invitation',
        message: `You've been invited to co-host a livestream by ${currentUser.full_name || currentUser.email}`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        metadata: {
          stream_id: streamId
        }
      });

      return await base44.entities.CoStreamParticipant.create({
        stream_id: streamId,
        participant_email: email,
        status: 'invited',
        can_broadcast: true,
        invited_by: currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['co-hosts', streamId]);
      toast.success('✅ Co-host invitation sent!');
      setShowInviteModal(false);
      setCoHostEmail("");
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to invite co-host');
    }
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async (inviteId) => {
      const updated = await base44.entities.CoStreamParticipant.update(inviteId, {
        status: 'accepted',
        joined_at: new Date().toISOString()
      });

      // Get stream details
      const streams = await base44.entities.StreamingContent.filter({ id: streamId });
      const stream = streams[0];

      // Notify the host
      if (stream?.created_by) {
        await base44.entities.Notification.create({
          recipient_email: stream.created_by,
          type: 'message',
          title: 'Co-Host Joined',
          message: `${currentUser.full_name || currentUser.email} has joined your livestream as a co-host`,
          sender_email: currentUser.email,
          sender_name: currentUser.full_name
        });
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['co-hosts', streamId]);
      toast.success('🎉 You are now co-hosting! Refresh to start broadcasting.');
      
      // Reload page to re-initialize as broadcaster
      setTimeout(() => {
        window.location.href = `${window.location.pathname}?id=${streamId}&broadcaster=true`;
      }, 2000);
    }
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.CoStreamParticipant.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['co-hosts', streamId]);
      toast.success('Co-host removed');
    }
  });

  const myInvite = coHosts.find(c => c.participant_email === currentUser?.email && c.status === 'invited');
  const activeCoHosts = coHosts.filter(c => c.status === 'accepted');

  return (
    <div className="space-y-4">
      {/* My Pending Invite */}
      {myInvite && (
        <Card className="bg-purple-500/20 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">You've been invited to co-host!</p>
                <p className="text-gray-300 text-sm">Join this livestream as a co-host</p>
              </div>
              <Button
                onClick={() => acceptInviteMutation.mutate(myInvite.id)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Co-Host List */}
      {activeCoHosts.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-white font-semibold">Co-Hosts ({activeCoHosts.length})</span>
          </div>
          <div className="space-y-2">
            {activeCoHosts.map(coHost => (
              <div key={coHost.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {coHost.participant_email[0].toUpperCase()}
                  </div>
                  <span className="text-white text-sm">{coHost.participant_email}</span>
                  <Badge className="bg-green-500/20 text-green-300 text-xs">
                    Live
                  </Badge>
                </div>
                {isCreator && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMutation.mutate(coHost.id)}
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Button (Creator Only) */}
      {isCreator && (
        <Button
          onClick={() => setShowInviteModal(true)}
          variant="outline"
          className="w-full bg-white/5 border-white/20 hover:bg-white/10"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Co-Host
        </Button>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-white mb-4">Invite Co-Host</h3>
              <Input
                value={coHostEmail}
                onChange={(e) => setCoHostEmail(e.target.value)}
                placeholder="Enter email address"
                className="bg-white/10 border-white/20 text-white mb-4"
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => inviteMutation.mutate(coHostEmail)}
                  disabled={!coHostEmail || inviteMutation.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Send Invite
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
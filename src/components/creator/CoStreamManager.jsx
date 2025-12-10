import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, X, CheckCircle, Clock, Shield } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CoStreamManager({ streamId, currentUser, isScheduled = false }) {
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    creator_email: "",
    role: "guest",
    can_moderate: false,
    revenue_share_percent: 0
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['co-stream-participants', streamId],
    queryFn: async () => {
      if (!streamId) return [];
      return await base44.entities.CoStreamParticipant.filter({ stream_id: streamId });
    },
    enabled: !!streamId,
    refetchInterval: 5000,
    initialData: []
  });

  const inviteParticipantMutation = useMutation({
    mutationFn: async (data) => {
      const participant = await base44.entities.CoStreamParticipant.create({
        ...data,
        stream_id: streamId
      });

      // Send notification to invited creator
      await base44.asServiceRole.entities.Notification.create({
        user_email: data.creator_email,
        type: 'costream_invite',
        title: 'Co-Stream Invitation',
        message: `${currentUser.full_name || currentUser.email} invited you to co-stream!`,
        related_id: participant.id,
        read: false
      });

      return participant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['co-stream-participants'] });
      setShowInvite(false);
      setInviteForm({
        creator_email: "",
        role: "guest",
        can_moderate: false,
        revenue_share_percent: 0
      });
      toast.success('Co-streamer invited!');
    }
  });

  const updateParticipantMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CoStreamParticipant.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['co-stream-participants'] });
      toast.success('Updated');
    }
  });

  const removeParticipantMutation = useMutation({
    mutationFn: (id) => base44.entities.CoStreamParticipant.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['co-stream-participants'] });
      toast.success('Participant removed');
    }
  });

  const totalShares = participants.reduce((sum, p) => sum + (p.revenue_share_percent || 0), 0);
  const remainingShare = 100 - totalShares;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Co-Streamers
            {participants.length > 0 && (
              <Badge className="bg-purple-500/20 text-purple-300">
                {participants.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            onClick={() => setShowInvite(true)}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Invite
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue Share Warning */}
        {remainingShare < 0 && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-300 text-sm">
              ⚠️ Revenue shares exceed 100%! Total: {totalShares}%
            </p>
          </div>
        )}

        {remainingShare > 0 && participants.length > 0 && (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-300 text-sm">
              You keep {remainingShare}% of revenue
            </p>
          </div>
        )}

        {/* Participants List */}
        {participants.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No co-streamers yet. Invite creators to collaborate!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {participants.map(participant => (
              <div key={participant.id} className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {participant.creator_email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{participant.creator_email}</div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-500/20 text-indigo-300 text-xs capitalize">
                          {participant.role}
                        </Badge>
                        {participant.status === 'invited' && (
                          <Badge className="bg-yellow-500/20 text-yellow-300 text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {participant.status === 'accepted' && (
                          <Badge className="bg-green-500/20 text-green-300 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Accepted
                          </Badge>
                        )}
                        {participant.can_moderate && (
                          <Badge className="bg-blue-500/20 text-blue-300 text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Moderator
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => removeParticipantMutation.mutate(participant.id)}
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {participant.revenue_share_percent > 0 && (
                  <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-white/10">
                    <span className="text-gray-400">Revenue Share</span>
                    <span className="text-green-400 font-bold">{participant.revenue_share_percent}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Invite Modal */}
        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
              onClick={() => setShowInvite(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-white/20"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Invite Co-Streamer</h3>
                  <button onClick={() => setShowInvite(false)}>
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <Input
                    placeholder="Creator Email"
                    value={inviteForm.creator_email}
                    onChange={(e) => setInviteForm({...inviteForm, creator_email: e.target.value})}
                    className="bg-white/10 border-white/20 text-white"
                  />

                  <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({...inviteForm, role: v})}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="co-host">Co-Host (Full Control)</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Revenue Share %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={inviteForm.revenue_share_percent}
                      onChange={(e) => setInviteForm({...inviteForm, revenue_share_percent: Number(e.target.value)})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      Remaining share: {remainingShare - inviteForm.revenue_share_percent}%
                    </p>
                  </div>

                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inviteForm.can_moderate}
                      onChange={(e) => setInviteForm({...inviteForm, can_moderate: e.target.checked})}
                      className="w-5 h-5 rounded accent-purple-500"
                    />
                    Allow moderation access
                  </label>

                  <Button
                    onClick={() => inviteParticipantMutation.mutate(inviteForm)}
                    disabled={!inviteForm.creator_email || inviteParticipantMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    Send Invitation
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
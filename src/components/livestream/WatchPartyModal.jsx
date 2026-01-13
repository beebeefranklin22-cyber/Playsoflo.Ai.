import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Copy, X, Play, Pause, Lock, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function WatchPartyModal({ content, currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [activeParty, setActiveParty] = useState(null);
  const [partyName, setPartyName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(10);

  const { data: watchParties = [] } = useQuery({
    queryKey: ['watch-parties', content?.id],
    queryFn: () => base44.entities.WatchParty.filter({
      content_id: content.id,
      is_active: true
    }),
    enabled: !!content,
    refetchInterval: 2000
  });

  const createPartyMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.WatchParty.create({
        content_id: content.id,
        host_email: currentUser.email,
        host_name: currentUser.full_name || currentUser.email,
        party_name: data.name,
        participants: [currentUser.email],
        max_participants: data.max,
        is_public: data.isPublic,
        is_active: true
      });
    },
    onSuccess: (party) => {
      queryClient.invalidateQueries(['watch-parties']);
      setActiveParty(party);
      toast.success("Watch party created!");
    }
  });

  const joinPartyMutation = useMutation({
    mutationFn: async (party) => {
      if (!party.participants.includes(currentUser.email)) {
        return await base44.entities.WatchParty.update(party.id, {
          participants: [...party.participants, currentUser.email]
        });
      }
      return party;
    },
    onSuccess: (party) => {
      queryClient.invalidateQueries(['watch-parties']);
      setActiveParty(party);
      toast.success("Joined watch party!");
    }
  });

  const leavePartyMutation = useMutation({
    mutationFn: async (party) => {
      const newParticipants = party.participants.filter(email => email !== currentUser.email);
      
      if (party.host_email === currentUser.email || newParticipants.length === 0) {
        return await base44.entities.WatchParty.update(party.id, {
          is_active: false
        });
      }
      
      return await base44.entities.WatchParty.update(party.id, {
        participants: newParticipants
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['watch-parties']);
      setActiveParty(null);
      toast.info("Left watch party");
    }
  });

  const syncPlaybackMutation = useMutation({
    mutationFn: async ({ partyId, time, playing }) => {
      return await base44.entities.WatchParty.update(partyId, {
        current_playback_time: time,
        is_playing: playing
      });
    }
  });

  // Real-time sync
  useEffect(() => {
    if (!activeParty) return;

    const unsubscribe = base44.entities.WatchParty.subscribe((event) => {
      if (event.data.id === activeParty.id) {
        queryClient.invalidateQueries(['watch-parties']);
        setActiveParty(event.data);
      }
    });

    return unsubscribe;
  }, [activeParty]);

  const handleCreateParty = (e) => {
    e.preventDefault();
    createPartyMutation.mutate({
      name: partyName,
      max: maxParticipants,
      isPublic
    });
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/streaming?watch_party=${activeParty.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            Watch Together
          </h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {!activeParty ? (
          <>
            {/* Create Party */}
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-6 mb-6">
              <h3 className="text-white font-semibold mb-4">Create Watch Party</h3>
              <form onSubmit={handleCreateParty} className="space-y-4">
                <Input
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="Party name..."
                  required
                  className="bg-white/10 border-white/20 text-white"
                />

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4"
                    />
                    {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span>{isPublic ? "Public" : "Private"}</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Max guests:</span>
                    <Input
                      type="number"
                      min="2"
                      max="50"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                      className="w-20 bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={createPartyMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  Create Party
                </Button>
              </form>
            </div>

            {/* Join Existing Parties */}
            {watchParties.length > 0 && (
              <div>
                <h3 className="text-white font-semibold mb-4">Active Watch Parties</h3>
                <div className="space-y-3">
                  {watchParties.map(party => (
                    <div
                      key={party.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-purple-500/50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-semibold">{party.party_name}</h4>
                            {party.is_public ? (
                              <Globe className="w-4 h-4 text-green-400" />
                            ) : (
                              <Lock className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <p className="text-gray-400 text-sm">
                            Host: {party.host_name} • {party.participants.length}/{party.max_participants} watching
                          </p>
                        </div>

                        <Button
                          onClick={() => joinPartyMutation.mutate(party)}
                          disabled={party.participants.length >= party.max_participants}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Join
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {/* Active Party Info */}
            <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-xl">{activeParty.party_name}</h3>
                <Badge className="bg-green-500">
                  <Users className="w-3 h-3 mr-1" />
                  {activeParty.participants.length}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Button
                  onClick={copyInviteLink}
                  size="sm"
                  variant="outline"
                  className="flex-1 bg-white/5"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Invite Link
                </Button>
                <Button
                  onClick={() => leavePartyMutation.mutate(activeParty)}
                  size="sm"
                  variant="outline"
                  className="bg-red-500/20 hover:bg-red-500/30"
                >
                  Leave Party
                </Button>
              </div>

              <div className="bg-black/20 rounded-lg p-3">
                <p className="text-gray-400 text-sm mb-2">Participants:</p>
                <div className="flex flex-wrap gap-2">
                  {activeParty.participants.map((email, idx) => (
                    <Badge key={idx} className="bg-purple-600">
                      {email === activeParty.host_email && "👑 "}
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-white font-semibold mb-3">Synced Playback</p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    syncPlaybackMutation.mutate({
                      partyId: activeParty.id,
                      time: activeParty.current_playback_time || 0,
                      playing: !activeParty.is_playing
                    });
                  }}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {activeParty.is_playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <div className="flex-1">
                  <p className="text-gray-400 text-sm">
                    {activeParty.is_playing ? "Playing" : "Paused"} at {Math.floor(activeParty.current_playback_time || 0)}s
                  </p>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                {activeParty.host_email === currentUser.email 
                  ? "You control playback for all participants" 
                  : "Playback is synced with the host"}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
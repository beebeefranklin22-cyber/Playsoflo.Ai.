import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Radio, Users, MessageSquare, Ban, Trash2, Calendar,
  Eye, Plus, StopCircle, Play, Clock, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LivestreamManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    description: "",
    scheduled_time: "",
    duration_minutes: 60,
    category: "entertainment",
    thumbnail_url: ""
  });

  // Fetch active livestreams
  const { data: activeStreams = [] } = useQuery({
    queryKey: ['active-streams', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.StreamingContent.filter({
        created_by: currentUser.email,
        is_live: true
      });
    },
    enabled: !!currentUser,
    refetchInterval: 5000,
    initialData: []
  });

  // Fetch scheduled streams
  const { data: scheduledStreams = [] } = useQuery({
    queryKey: ['scheduled-streams', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.LivestreamSchedule.filter({
        creator_email: currentUser.email,
        status: 'scheduled'
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Real-time stats for each stream
  const getStreamStats = (streamId) => {
    const { data: chatMessages = [] } = useQuery({
      queryKey: ['stream-stats-chat', streamId],
      queryFn: () => base44.entities.LivestreamChat.filter({ 
        stream_id: streamId,
        is_deleted: false 
      }),
      refetchInterval: 3000,
      initialData: []
    });

    const { data: reactions = [] } = useQuery({
      queryKey: ['stream-stats-reactions', streamId],
      queryFn: () => base44.entities.LivestreamReaction.filter({ stream_id: streamId }),
      refetchInterval: 5000,
      initialData: []
    });

    // Simulate viewer count
    const viewerCount = Math.floor(Math.random() * 500) + 50;

    return {
      viewers: viewerCount,
      messages: chatMessages.length,
      reactions: reactions.length
    };
  };

  // End livestream
  const endStreamMutation = useMutation({
    mutationFn: async (streamId) => {
      await base44.asServiceRole.entities.StreamingContent.update(streamId, { is_live: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-streams'] });
      toast.success('Livestream ended');
    }
  });

  // Delete chat message
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId) => 
      base44.asServiceRole.entities.LivestreamChat.update(messageId, { is_deleted: true }),
    onSuccess: () => {
      toast.success('Message deleted');
    }
  });

  // Schedule livestream
  const scheduleStreamMutation = useMutation({
    mutationFn: (data) => base44.entities.LivestreamSchedule.create({
      ...data,
      creator_email: currentUser.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-streams'] });
      setShowScheduleModal(false);
      setScheduleForm({
        title: "",
        description: "",
        scheduled_time: "",
        duration_minutes: 60,
        category: "entertainment",
        thumbnail_url: ""
      });
      toast.success('Livestream scheduled!');
    }
  });

  // Start scheduled stream
  const startScheduledMutation = useMutation({
    mutationFn: async (schedule) => {
      const stream = await base44.entities.StreamingContent.create({
        title: schedule.title,
        type: 'live_event',
        category: schedule.category,
        description: schedule.description,
        thumbnail_url: schedule.thumbnail_url,
        is_live: true,
        rating: 0,
        requires_subscription: false,
        betting_available: false
      });

      await base44.asServiceRole.entities.LivestreamSchedule.update(schedule.id, {
        status: 'live',
        stream_id: stream.id
      });

      return stream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-streams'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-streams'] });
      toast.success('Livestream started!');
    }
  });

  // Cancel scheduled stream
  const cancelScheduleMutation = useMutation({
    mutationFn: (scheduleId) => 
      base44.asServiceRole.entities.LivestreamSchedule.update(scheduleId, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-streams'] });
      toast.success('Stream cancelled');
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Livestream Management</h2>
          <p className="text-gray-400 mt-1">Manage your active and scheduled livestreams</p>
        </div>
        <Button
          onClick={() => setShowScheduleModal(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Stream
        </Button>
      </div>

      {/* Active Livestreams */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" />
            Active Livestreams
            {activeStreams.length > 0 && (
              <Badge className="bg-red-500/20 text-red-300 ml-2">
                {activeStreams.length} LIVE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeStreams.length === 0 ? (
            <div className="text-center py-12">
              <Radio className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No active livestreams</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeStreams.map((stream) => {
                const stats = getStreamStats(stream.id);
                
                return (
                  <motion.div
                    key={stream.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-bold text-xl">{stream.title}</h3>
                          <Badge className="bg-red-500 text-white flex items-center gap-1">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            LIVE
                          </Badge>
                        </div>
                        <p className="text-gray-300 text-sm">{stream.description}</p>
                      </div>
                      <Button
                        onClick={() => endStreamMutation.mutate(stream.id)}
                        variant="outline"
                        className="bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-300"
                      >
                        <StopCircle className="w-4 h-4 mr-2" />
                        End Stream
                      </Button>
                    </div>

                    {/* Real-time Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-black/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                          <Users className="w-4 h-4" />
                          Viewers
                        </div>
                        <div className="text-white text-2xl font-bold">{stats.viewers}</div>
                      </div>
                      <div className="bg-black/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                          <MessageSquare className="w-4 h-4" />
                          Messages
                        </div>
                        <div className="text-white text-2xl font-bold">{stats.messages}</div>
                      </div>
                      <div className="bg-black/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                          <Eye className="w-4 h-4" />
                          Reactions
                        </div>
                        <div className="text-white text-2xl font-bold">{stats.reactions}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link to={`${createPageUrl("LivestreamViewer")}?id=${stream.id}`}>
                        <Button className="bg-purple-600 hover:bg-purple-700">
                          <Eye className="w-4 h-4 mr-2" />
                          View Stream
                        </Button>
                      </Link>
                      <StreamModerationPanel streamId={stream.id} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Livestreams */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Scheduled Livestreams
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledStreams.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No scheduled livestreams</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledStreams.map((schedule) => (
                <div key={schedule.id} className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">{schedule.title}</h3>
                      <p className="text-gray-400 text-sm mb-2">{schedule.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-purple-400">
                          <Clock className="w-4 h-4" />
                          {new Date(schedule.scheduled_time).toLocaleString()}
                        </div>
                        <Badge className="bg-blue-500/20 text-blue-300">
                          {schedule.duration_minutes} min
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => startScheduledMutation.mutate(schedule)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start Now
                      </Button>
                      <Button
                        onClick={() => cancelScheduleMutation.mutate(schedule.id)}
                        size="sm"
                        variant="outline"
                        className="bg-red-600/20 hover:bg-red-600/30 border-red-500/30"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowScheduleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Schedule Livestream</h3>
                <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  placeholder="Stream Title"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({...scheduleForm, title: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Textarea
                  placeholder="Description"
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({...scheduleForm, description: e.target.value})}
                  className="bg-white/10 border-white/20 text-white min-h-20"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Scheduled Time</label>
                    <Input
                      type="datetime-local"
                      value={scheduleForm.scheduled_time}
                      onChange={(e) => setScheduleForm({...scheduleForm, scheduled_time: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Duration (minutes)</label>
                    <Input
                      type="number"
                      value={scheduleForm.duration_minutes}
                      onChange={(e) => setScheduleForm({...scheduleForm, duration_minutes: Number(e.target.value)})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <Select value={scheduleForm.category} onValueChange={(v) => setScheduleForm({...scheduleForm, category: v})}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="gaming">Gaming</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => scheduleStreamMutation.mutate(scheduleForm)}
                  disabled={!scheduleForm.title || !scheduleForm.scheduled_time}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Schedule Livestream
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Moderation Panel Component
function StreamModerationPanel({ streamId }) {
  const [showPanel, setShowPanel] = useState(false);
  const queryClient = useQueryClient();

  const { data: recentMessages = [] } = useQuery({
    queryKey: ['stream-moderation', streamId],
    queryFn: () => base44.entities.LivestreamChat.filter({ 
      stream_id: streamId,
      is_deleted: false 
    }),
    enabled: showPanel,
    refetchInterval: 2000,
    initialData: []
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId) => 
      base44.asServiceRole.entities.LivestreamChat.update(messageId, { is_deleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-moderation', streamId] });
      toast.success('Message deleted');
    }
  });

  if (!showPanel) {
    return (
      <Button
        onClick={() => setShowPanel(true)}
        variant="outline"
        className="bg-white/5 border-white/10"
      >
        <Ban className="w-4 h-4 mr-2" />
        Moderate
      </Button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={() => setShowPanel(false)}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-white/20 max-h-[80vh] overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Chat Moderation</h3>
            <button onClick={() => setShowPanel(false)} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {recentMessages.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No messages yet</p>
            ) : (
              recentMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-purple-300 font-semibold text-sm">{msg.user_name}</span>
                      <span className="text-gray-500 text-xs">
                        {new Date(msg.created_date).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-white text-sm">{msg.message}</p>
                  </div>
                  <Button
                    onClick={() => deleteMessageMutation.mutate(msg.id)}
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
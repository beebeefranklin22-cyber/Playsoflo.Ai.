import React, { useState } from "react";
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
  Eye, Plus, StopCircle, Play, Clock, X, DollarSign, Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StreamCalendarView from "../creator/StreamCalendarView.jsx";
import CoStreamManager from "../creator/CoStreamManager.jsx";
import CreatePPVStreamModal from "./CreatePPVStreamModal.jsx";

export default function LivestreamManager({ currentUser }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPPVModal, setShowPPVModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: "", description: "", scheduled_time: "", duration_minutes: 60,
    category: "entertainment", thumbnail_file: null,
    is_recurring: false, recurrence_pattern: "none", recurrence_end_date: "",
    access_type: "public", ppv_price_usd: 0, member_discount_percent: 0
  });

  const { data: activeStreams = [] } = useQuery({
    queryKey: ['active-streams', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.StreamingContent.filter({ created_by: currentUser.email, is_live: true });
    },
    enabled: !!currentUser,
    refetchInterval: 8000,
    initialData: []
  });

  const { data: scheduledStreams = [] } = useQuery({
    queryKey: ['scheduled-streams', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.LivestreamSchedule.filter({ creator_email: currentUser.email, status: 'scheduled' });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const endStreamMutation = useMutation({
    mutationFn: (streamId) => base44.entities.StreamingContent.update(streamId, { is_live: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-streams'] });
      toast.success('Livestream ended');
    }
  });

  const scheduleStreamMutation = useMutation({
    mutationFn: async (data) => {
      let thumbnail_url = "";
      if (data.thumbnail_file) {
        const uploaded = await base44.integrations.Core.UploadFile({ file: data.thumbnail_file });
        thumbnail_url = uploaded.file_url;
      }
      const schedule = await base44.entities.LivestreamSchedule.create({
        title: data.title, description: data.description, scheduled_time: data.scheduled_time,
        duration_minutes: data.duration_minutes, category: data.category,
        thumbnail_url, creator_email: currentUser.email, status: 'scheduled',
        is_recurring: data.is_recurring, recurrence_pattern: data.recurrence_pattern,
        recurrence_end_date: data.recurrence_end_date, access_type: data.access_type,
        ppv_price_usd: data.ppv_price_usd, member_discount_percent: data.member_discount_percent
      });
      // Notify followers
      const followers = await base44.entities.Follow.filter({ following_email: currentUser.email });
      await Promise.all(followers.map(f =>
        base44.entities.Notification.create({
          recipient_email: f.follower_email, type: 'message',
          title: `${currentUser.full_name || 'Someone'} scheduled a livestream`,
          message: `"${data.title}" — ${new Date(data.scheduled_time).toLocaleString()}`,
          sender_email: currentUser.email, sender_name: currentUser.full_name, read: false
        }).catch(() => {})
      ));
      return schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-streams'] });
      setShowScheduleModal(false);
      setScheduleForm({ title: "", description: "", scheduled_time: "", duration_minutes: 60, category: "entertainment", thumbnail_file: null, is_recurring: false, recurrence_pattern: "none", recurrence_end_date: "", access_type: "public", ppv_price_usd: 0, member_discount_percent: 0 });
      toast.success('Stream scheduled! Followers notified.');
    }
  });

  const startScheduledMutation = useMutation({
    mutationFn: async (schedule) => {
      const channelName = `livestream_${Date.now()}_${currentUser.id.substring(0, 8)}`;
      const stream = await base44.entities.StreamingContent.create({
        title: schedule.title, type: 'live_event', category: schedule.category,
        description: schedule.description, thumbnail_url: schedule.thumbnail_url,
        is_live: true, status: 'live', agora_channel_name: channelName,
        creator_email: currentUser.email, rating: 0, requires_subscription: false, betting_available: false
      });
      await base44.entities.LivestreamSchedule.update(schedule.id, { status: 'live', stream_id: stream.id });
      return stream;
    },
    onSuccess: (stream) => {
      queryClient.invalidateQueries({ queryKey: ['active-streams', 'scheduled-streams'] });
      toast.success('Stream started!');
      navigate(createPageUrl("LivestreamViewer") + `?id=${stream.id}&broadcaster=true`);
    }
  });

  const cancelScheduleMutation = useMutation({
    mutationFn: (id) => base44.entities.LivestreamSchedule.update(id, { status: 'cancelled' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['scheduled-streams'] }); toast.success('Stream cancelled'); }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Livestreams</h2>
          <p className="text-gray-400 text-sm mt-0.5">Manage your broadcasts</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowPPVModal(true)} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
            <DollarSign className="w-4 h-4 mr-1" /> PPV Stream
          </Button>
          <Button onClick={() => setShowScheduleModal(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <Calendar className="w-4 h-4 mr-1" /> Schedule
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      <StreamCalendarView currentUser={currentUser} />

      {/* Active Livestreams */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Radio className="w-5 h-5 text-red-400" />
            Active Streams
            {activeStreams.length > 0 && (
              <Badge className="bg-red-500/20 text-red-300 border-0">{activeStreams.length} LIVE</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeStreams.length === 0 ? (
            <div className="text-center py-10">
              <Radio className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No active streams</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeStreams.map((stream) => (
                <ActiveStreamCard
                  key={stream.id}
                  stream={stream}
                  currentUser={currentUser}
                  onEnd={() => endStreamMutation.mutate(stream.id)}
                  onBroadcast={() => navigate(createPageUrl("LivestreamViewer") + `?id=${stream.id}&broadcaster=true`)}
                  onViewAsViewer={() => navigate(createPageUrl("LivestreamViewer") + `?id=${stream.id}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" /> Scheduled
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledStreams.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No scheduled streams</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledStreams.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{schedule.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-purple-400 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(schedule.scheduled_time).toLocaleString()}
                      </span>
                      <Badge className="bg-blue-500/20 text-blue-300 text-xs border-0">{schedule.duration_minutes}min</Badge>
                      {schedule.ppv_price_usd > 0 && (
                        <Badge className="bg-green-500/20 text-green-300 text-xs border-0">${schedule.ppv_price_usd}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button onClick={() => startScheduledMutation.mutate(schedule)} size="sm" className="bg-green-600 hover:bg-green-700 h-8 text-xs">
                      <Play className="w-3 h-3 mr-1" /> Start
                    </Button>
                    <Button onClick={() => cancelScheduleMutation.mutate(schedule.id)} size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 h-8 text-xs">
                      Cancel
                    </Button>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowScheduleModal(false)}
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-gray-900 rounded-2xl p-6 border border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-white">Schedule Stream</h3>
                <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <Input placeholder="Stream Title *" value={scheduleForm.title}
                  onChange={(e) => setScheduleForm(p => ({ ...p, title: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white" />

                <Textarea placeholder="Description" value={scheduleForm.description}
                  onChange={(e) => setScheduleForm(p => ({ ...p, description: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white min-h-20" />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Date & Time *</label>
                    <Input type="datetime-local" value={scheduleForm.scheduled_time}
                      onChange={(e) => setScheduleForm(p => ({ ...p, scheduled_time: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Duration (min)</label>
                    <Input type="number" value={scheduleForm.duration_minutes}
                      onChange={(e) => setScheduleForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))}
                      className="bg-white/10 border-white/20 text-white" />
                  </div>
                </div>

                <Select value={scheduleForm.category} onValueChange={(v) => setScheduleForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {['entertainment', 'sports', 'gaming', 'music', 'news', 'lifestyle'].map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Thumbnail (optional)</label>
                  <Input type="file" accept="image/*"
                    onChange={(e) => setScheduleForm(p => ({ ...p, thumbnail_file: e.target.files?.[0] || null }))}
                    className="bg-white/10 border-white/20 text-white" />
                  {scheduleForm.thumbnail_file && (
                    <p className="text-green-400 text-xs mt-1">✓ {scheduleForm.thumbnail_file.name}</p>
                  )}
                </div>

                <div className="border-t border-white/10 pt-4">
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input type="checkbox" checked={scheduleForm.is_recurring}
                      onChange={(e) => setScheduleForm(p => ({ ...p, is_recurring: e.target.checked, recurrence_pattern: e.target.checked ? 'weekly' : 'none' }))}
                      className="w-4 h-4 rounded accent-purple-500" />
                    <span className="text-sm">Recurring stream</span>
                  </label>
                  {scheduleForm.is_recurring && (
                    <div className="mt-3 grid grid-cols-2 gap-3 pl-6">
                      <Select value={scheduleForm.recurrence_pattern} onValueChange={(v) => setScheduleForm(p => ({ ...p, recurrence_pattern: v }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">End Date</label>
                        <Input type="date" value={scheduleForm.recurrence_end_date}
                          onChange={(e) => setScheduleForm(p => ({ ...p, recurrence_end_date: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white text-sm" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 pt-4">
                  <label className="text-gray-400 text-xs mb-1.5 block">Access Type</label>
                  <Select value={scheduleForm.access_type} onValueChange={(v) => setScheduleForm(p => ({ ...p, access_type: v }))}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public (Free)</SelectItem>
                      <SelectItem value="members_only">Members Only</SelectItem>
                      <SelectItem value="ppv">Pay-Per-View</SelectItem>
                    </SelectContent>
                  </Select>
                  {scheduleForm.access_type === 'ppv' && (
                    <div className="mt-3">
                      <label className="text-gray-400 text-xs mb-1 block">PPV Price (USD)</label>
                      <Input type="number" step="0.01" value={scheduleForm.ppv_price_usd}
                        onChange={(e) => setScheduleForm(p => ({ ...p, ppv_price_usd: Number(e.target.value) }))}
                        className="bg-white/10 border-white/20 text-white" />
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => scheduleStreamMutation.mutate(scheduleForm)}
                  disabled={!scheduleForm.title || !scheduleForm.scheduled_time || scheduleStreamMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700 h-11"
                >
                  {scheduleStreamMutation.isPending ? 'Scheduling...' : 'Schedule Stream'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreatePPVStreamModal
        isOpen={showPPVModal}
        onClose={() => setShowPPVModal(false)}
        currentUser={currentUser}
        onSuccess={(stream) => {
          queryClient.invalidateQueries({ queryKey: ['active-streams'] });
          navigate(createPageUrl("LivestreamViewer") + `?id=${stream.id}&broadcaster=true`);
        }}
      />
    </div>
  );
}

// Active stream card — avoids hooks inside loops
function ActiveStreamCard({ stream, currentUser, onEnd, onBroadcast, onViewAsViewer }) {
  const [showMod, setShowMod] = useState(false);

  const { data: chatCount = 0 } = useQuery({
    queryKey: ['stream-chat-count', stream.id],
    queryFn: async () => {
      const msgs = await base44.entities.LivestreamChat.filter({ stream_id: stream.id, is_deleted: false });
      return msgs.length;
    },
    refetchInterval: 5000,
    initialData: 0
  });

  const { data: viewerCount = 0 } = useQuery({
    queryKey: ['stream-viewer-count', stream.id],
    queryFn: async () => {
      const v = await base44.entities.ViewerAnalytics.filter({ content_id: stream.id, is_currently_watching: true });
      return v.length;
    },
    refetchInterval: 5000,
    initialData: 0
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-xl"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-bold truncate">{stream.title}</h3>
            <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded-full text-white text-xs font-bold">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
          {stream.description && <p className="text-gray-400 text-sm truncate">{stream.description}</p>}
        </div>
        <Button onClick={onEnd} size="sm" variant="outline" className="bg-red-600/20 hover:bg-red-600/30 border-red-500/30 text-red-300 flex-shrink-0 h-8 text-xs">
          <StopCircle className="w-3.5 h-3.5 mr-1" /> End
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/20 rounded-lg p-3 flex items-center gap-3">
          <Users className="w-4 h-4 text-purple-400" />
          <div>
            <p className="text-white font-bold text-xl">{viewerCount}</p>
            <p className="text-gray-400 text-xs">Watching</p>
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-3 flex items-center gap-3">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-white font-bold text-xl">{chatCount}</p>
            <p className="text-gray-400 text-xs">Messages</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={onBroadcast} className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-sm h-9">
          <Radio className="w-4 h-4 mr-1" /> Broadcast
        </Button>
        <Button onClick={onViewAsViewer} className="bg-purple-600/80 hover:bg-purple-600 text-sm h-9">
          <Eye className="w-4 h-4 mr-1" /> Preview
        </Button>
        <Button onClick={() => setShowMod(true)} variant="ghost" className="text-gray-300 hover:bg-white/10 text-sm h-9 border border-white/10">
          <Ban className="w-4 h-4 mr-1" /> Moderate
        </Button>
      </div>

      <CoStreamManager streamId={stream.id} currentUser={currentUser} />

      {showMod && <ModerationModal streamId={stream.id} onClose={() => setShowMod(false)} />}
    </motion.div>
  );
}

function ModerationModal({ streamId, onClose }) {
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['mod-messages', streamId],
    queryFn: () => base44.entities.LivestreamChat.filter({ stream_id: streamId, is_deleted: false }),
    refetchInterval: 3000,
    initialData: []
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LivestreamChat.update(id, { is_deleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mod-messages', streamId] });
      toast.success('Message removed');
    }
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-gray-900 rounded-2xl border border-white/10 overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-400" /> Chat Moderation
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No messages</p>
          ) : messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
              <div className="flex-1 min-w-0">
                <span className="text-purple-300 font-semibold text-sm">{msg.user_name}</span>
                <span className="text-gray-400 text-xs ml-2">{new Date(msg.created_date).toLocaleTimeString()}</span>
                <p className="text-white text-sm mt-0.5">{msg.message}</p>
              </div>
              <button onClick={() => deleteMutation.mutate(msg.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
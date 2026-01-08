import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, X, Clock, Radio, Trash2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ContentScheduler({ currentUser }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduled_time: "",
    duration_minutes: 60,
    category: "entertainment",
    access_type: "public",
    ppv_price_usd: 0,
    is_recurring: false,
    recurrence_pattern: "weekly"
  });

  const { data: scheduled = [] } = useQuery({
    queryKey: ['scheduled-content', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.LivestreamSchedule.filter({
        creator_email: currentUser.email,
        status: { $in: ['scheduled', 'upcoming'] }
      });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LivestreamSchedule.create({
      ...data,
      creator_email: currentUser.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-content']);
      toast.success('Content scheduled successfully!');
      setShowCreateModal(false);
      setForm({
        title: "",
        description: "",
        scheduled_time: "",
        duration_minutes: 60,
        category: "entertainment",
        access_type: "public",
        ppv_price_usd: 0,
        is_recurring: false,
        recurrence_pattern: "weekly"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LivestreamSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-content']);
      toast.success('Schedule deleted');
    }
  });

  const startNowMutation = useMutation({
    mutationFn: async (schedule) => {
      const channelName = `livestream_${Date.now()}_${currentUser.id.substring(0, 8)}`;
      
      const stream = await base44.entities.StreamingContent.create({
        title: schedule.title,
        type: 'live_event',
        category: schedule.category,
        description: schedule.description,
        is_live: true,
        rating: 0,
        requires_subscription: false,
        betting_available: false,
        agora_channel_name: channelName,
        creator_email: currentUser.email
      });

      await base44.entities.LivestreamSchedule.update(schedule.id, {
        status: 'live',
        stream_id: stream.id
      });

      return stream;
    },
    onSuccess: (stream) => {
      queryClient.invalidateQueries(['scheduled-content']);
      toast.success('Livestream started!');
      navigate(createPageUrl("LivestreamViewer") + `?id=${stream.id}&broadcaster=true`);
    }
  });

  const upcomingStreams = scheduled
    .filter(s => new Date(s.scheduled_time) > new Date())
    .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));

  const pastStreams = scheduled
    .filter(s => new Date(s.scheduled_time) <= new Date())
    .sort((a, b) => new Date(b.scheduled_time) - new Date(a.scheduled_time));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Content Scheduler</h2>
          <p className="text-gray-400">Plan and organize your content calendar</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Content
        </Button>
      </div>

      {/* Calendar View */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingStreams.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No scheduled content</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingStreams.map(schedule => (
                <div key={schedule.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-white font-bold">{schedule.title}</h3>
                        {schedule.is_recurring && (
                          <Badge className="bg-indigo-500/20 text-indigo-300">
                            {schedule.recurrence_pattern}
                          </Badge>
                        )}
                        {schedule.ppv_price_usd > 0 && (
                          <Badge className="bg-green-500/20 text-green-300">
                            ${schedule.ppv_price_usd} PPV
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{schedule.description}</p>
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
                        onClick={() => startNowMutation.mutate(schedule)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start Now
                      </Button>
                      <Button
                        onClick={() => deleteMutation.mutate(schedule.id)}
                        size="sm"
                        variant="outline"
                        className="bg-red-600/20 hover:bg-red-600/30 border-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Schedule Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-gray-900 rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Schedule Content</h3>
                <button onClick={() => setShowCreateModal(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Textarea
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className="bg-white/10 border-white/20 text-white"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Date & Time</label>
                    <Input
                      type="datetime-local"
                      value={form.scheduled_time}
                      onChange={(e) => setForm({...form, scheduled_time: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Duration (min)</label>
                    <Input
                      type="number"
                      value={form.duration_minutes}
                      onChange={(e) => setForm({...form, duration_minutes: Number(e.target.value)})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
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

                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_recurring}
                    onChange={(e) => setForm({...form, is_recurring: e.target.checked})}
                    className="w-5 h-5 rounded accent-purple-500"
                  />
                  Make this recurring
                </label>

                {form.is_recurring && (
                  <Select value={form.recurrence_pattern} onValueChange={(v) => setForm({...form, recurrence_pattern: v})}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <Button
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.title || !form.scheduled_time || createMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Schedule Content
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Target, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function StreamScheduler({ currentUser, onClose, onScheduled }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduled_date: "",
    scheduled_time: "",
    category: "entertainment",
    goal_type: "viewers",
    goal_target: ""
  });

  const scheduleMutation = useMutation({
    mutationFn: async (data) => {
      const scheduledDateTime = new Date(`${data.scheduled_date}T${data.scheduled_time}`);
      
      const stream = await base44.entities.StreamingContent.create({
        title: data.title,
        description: data.description,
        type: "live_event",
        category: data.category,
        creator_email: currentUser.email,
        status: "scheduled",
        visibility: "public",
        stream_started_at: scheduledDateTime.toISOString()
      });

      if (data.goal_target) {
        await base44.entities.StreamGoal.create({
          stream_id: stream.id,
          creator_email: currentUser.email,
          goal_type: data.goal_type,
          target_amount: parseInt(data.goal_target),
          goal_title: `${data.goal_type} Goal`,
          goal_description: `Reach ${data.goal_target} ${data.goal_type}`
        });
      }

      await base44.entities.Notification.create({
        recipient_email: currentUser.email,
        type: "system_alert",
        title: "Stream Scheduled!",
        message: `Your stream "${data.title}" is scheduled for ${scheduledDateTime.toLocaleString()}`,
        reference_type: "post",
        reference_id: stream.id
      });

      return stream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['streaming-content']);
      toast.success("Stream scheduled!");
      if (onScheduled) onScheduled();
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    scheduleMutation.mutate(formData);
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
        className="w-full max-w-2xl bg-gray-900 rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Schedule Stream</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-white text-sm mb-2 block">Stream Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter stream title..."
              required
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-white text-sm mb-2 block">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What will you be streaming?"
              rows={3}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white text-sm mb-2 block flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Date
              </label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                required
                min={new Date().toISOString().split('T')[0]}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-white text-sm mb-2 block flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Time
              </label>
              <Input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                required
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-white text-sm mb-2 block">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="entertainment">Entertainment</option>
              <option value="gaming">Gaming</option>
              <option value="sports">Sports</option>
              <option value="music">Music</option>
              <option value="news">News</option>
              <option value="lifestyle">Lifestyle</option>
            </select>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              Stream Goal (Optional)
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Goal Type</label>
                <select
                  value={formData.goal_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, goal_type: e.target.value }))}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="viewers">Viewers</option>
                  <option value="subscribers">Subscribers</option>
                  <option value="donations">Donations ($)</option>
                  <option value="tips">Tips ($)</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Target</label>
                <Input
                  type="number"
                  value={formData.goal_target}
                  onChange={(e) => setFormData(prev => ({ ...prev, goal_target: e.target.value }))}
                  placeholder="e.g. 1000"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={scheduleMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
            >
              Schedule Stream
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
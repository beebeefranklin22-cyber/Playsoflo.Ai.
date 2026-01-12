import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Video, Monitor, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export default function LivestreamSetup({ currentUser, gameName, onClose, onStartStream }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [streamType, setStreamType] = useState('in-game');

  const createStreamMutation = useMutation({
    mutationFn: async () => {
      const channelName = `gaming-${currentUser.email}-${Date.now()}`;
      
      const stream = await base44.entities.StreamingContent.create({
        title: title || `${gameName} Gameplay`,
        description: description || `Live ${gameName} stream`,
        type: 'gaming_stream',
        category: 'gaming',
        is_live: true,
        creator_email: currentUser.email,
        agora_channel_name: channelName,
        status: 'live',
        visibility: 'public',
        stream_started_at: new Date().toISOString()
      });
      
      return { stream, channelName };
    },
    onSuccess: ({ stream, channelName }) => {
      toast.success('Stream created! 🎮');
      onStartStream(stream, channelName);
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 backdrop-blur-xl rounded-3xl border-2 border-purple-500/50 shadow-2xl max-w-lg w-full"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Video className="w-8 h-8 text-purple-400" />
            <h2 className="text-2xl font-black text-white">Start Livestream</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="text-white font-medium mb-2 block">Stream Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStreamType('in-game')}
                className={`p-4 rounded-xl border-2 transition ${
                  streamType === 'in-game'
                    ? 'border-purple-500 bg-purple-600/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <Gamepad2 className="w-8 h-8 text-white mx-auto mb-2" />
                <p className="text-white font-medium text-sm">In-Game</p>
                <p className="text-gray-400 text-xs">Browser games</p>
              </button>
              <button
                onClick={() => setStreamType('screen')}
                className={`p-4 rounded-xl border-2 transition ${
                  streamType === 'screen'
                    ? 'border-purple-500 bg-purple-600/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <Monitor className="w-8 h-8 text-white mx-auto mb-2" />
                <p className="text-white font-medium text-sm">Screen Share</p>
                <p className="text-gray-400 text-xs">Console/PC</p>
              </button>
            </div>
          </div>

          <div>
            <label className="text-white font-medium mb-2 block">Stream Title</label>
            <Input
              placeholder={`Playing ${gameName}...`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-white font-medium mb-2 block">Description</label>
            <Textarea
              placeholder="Tell viewers what to expect..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/10 border-white/20 text-white h-24"
            />
          </div>

          <Button
            onClick={() => createStreamMutation.mutate()}
            disabled={createStreamMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6 text-lg"
          >
            <Video className="w-6 h-6 mr-2" />
            {createStreamMutation.isPending ? 'Starting...' : 'Go Live'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
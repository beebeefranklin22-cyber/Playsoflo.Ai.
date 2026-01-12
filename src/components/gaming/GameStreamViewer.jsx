import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Eye, Heart, Share2, Monitor } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AgoraRTC from "agora-rtc-sdk-ng";
import { generateAgoraToken } from "@/functions/generateAgoraToken";

export default function GameStreamViewer({ stream, currentUser, onClose }) {
  const [message, setMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const videoRef = useRef(null);
  const agoraClientRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['stream-chat', stream.id],
    queryFn: async () => {
      return await base44.entities.LivestreamChatMessage.filter({ stream_id: stream.id }, 'created_date', 100);
    },
    refetchInterval: 2000
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text) => {
      await base44.entities.LivestreamChatMessage.create({
        stream_id: stream.id,
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        message: text,
        is_priority: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stream-chat', stream.id]);
      setMessage('');
    }
  });

  useEffect(() => {
    if (stream.agora_channel_name) {
      joinStream();
    }
    return () => leaveStream();
  }, [stream]);

  const joinStream = async () => {
    try {
      const { token } = await generateAgoraToken({ 
        channelName: stream.agora_channel_name,
        role: 'audience'
      });

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      agoraClientRef.current = client;

      await client.join(
        import.meta.env.VITE_AGORA_APP_ID,
        stream.agora_channel_name,
        token,
        null
      );

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "video" && videoRef.current) {
          user.videoTrack.play(videoRef.current);
        }
        if (mediaType === "audio") {
          user.audioTrack.play();
        }
      });

      setViewerCount(client.remoteUsers.length + 1);
    } catch (error) {
      console.error('Failed to join stream:', error);
      toast.error('Failed to join stream');
    }
  };

  const leaveStream = async () => {
    if (agoraClientRef.current) {
      await agoraClientRef.current.leave();
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black"
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/80 to-pink-900/80 backdrop-blur-sm p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">{stream.title}</h2>
            <p className="text-gray-300 text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {viewerCount} watching
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Video Player */}
          <div className="flex-1 bg-black flex items-center justify-center relative">
            <div ref={videoRef} className="w-full h-full" />
            
            {!stream.agora_channel_name && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <Monitor className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">Waiting for stream to start...</p>
                </div>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="w-full lg:w-96 bg-gradient-to-b from-gray-900 to-black border-l border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-bold flex items-center gap-2">
                💬 Live Chat
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(msg => (
                <div key={msg.id} className="bg-white/5 rounded-lg p-3">
                  <p className="text-purple-400 font-bold text-sm">{msg.user_name}</p>
                  <p className="text-white text-sm">{msg.message}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  placeholder="Send a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button type="submit" disabled={!message.trim()} className="bg-purple-600">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
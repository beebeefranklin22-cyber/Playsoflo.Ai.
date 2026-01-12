import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Monitor, Video, VideoOff, Mic, MicOff, Send, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AgoraRTC from "agora-rtc-sdk-ng";
import { generateAgoraToken } from "@/functions/generateAgoraToken";

export default function ScreenShareStreamer({ currentUser, stream, channelName, onClose }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [message, setMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  
  const videoRef = useRef(null);
  const agoraClientRef = useRef(null);
  const screenTrackRef = useRef(null);
  const audioTrackRef = useRef(null);
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
        is_priority: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stream-chat', stream.id]);
      setMessage('');
    }
  });

  const startScreenShare = async () => {
    try {
      const { token } = await generateAgoraToken({ 
        channelName,
        role: 'publisher'
      });

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      agoraClientRef.current = client;

      await client.join(
        import.meta.env.VITE_AGORA_APP_ID,
        channelName,
        token,
        null
      );

      // Create screen track
      const screenTrack = await AgoraRTC.createScreenVideoTrack({}, "disable");
      screenTrackRef.current = screenTrack;

      // Create audio track
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      audioTrackRef.current = audioTrack;

      // Publish tracks
      await client.publish([screenTrack, audioTrack]);

      // Play locally
      if (videoRef.current) {
        screenTrack.play(videoRef.current);
      }

      client.on("user-joined", (user) => {
        setViewerCount(prev => prev + 1);
      });

      client.on("user-left", (user) => {
        setViewerCount(prev => Math.max(0, prev - 1));
      });

      setIsStreaming(true);
      toast.success('Streaming started! 🎮');
    } catch (error) {
      console.error('Failed to start screen share:', error);
      toast.error('Failed to start screen share. Please allow screen capture.');
    }
  };

  const stopStream = async () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.close();
    }
    if (audioTrackRef.current) {
      audioTrackRef.current.close();
    }
    if (agoraClientRef.current) {
      await agoraClientRef.current.leave();
    }

    await base44.entities.StreamingContent.update(stream.id, { is_live: false, status: 'ended' });
    
    setIsStreaming(false);
    toast.success('Stream ended');
    onClose();
  };

  const toggleMute = () => {
    if (audioTrackRef.current) {
      if (isMuted) {
        audioTrackRef.current.setEnabled(true);
      } else {
        audioTrackRef.current.setEnabled(false);
      }
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    return () => {
      if (isStreaming) stopStream();
    };
  }, []);

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
        <div className="bg-gradient-to-r from-red-900/80 to-pink-900/80 backdrop-blur-sm p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white font-bold text-sm">LIVE</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{stream.title}</h2>
              <p className="text-gray-300 text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {viewerCount} viewers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <>
                <Button onClick={toggleMute} variant="outline" size="sm">
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Button onClick={stopStream} variant="destructive" size="sm">
                  <VideoOff className="w-5 h-5 mr-2" />
                  End Stream
                </Button>
              </>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Video Display */}
          <div className="flex-1 bg-black flex items-center justify-center relative">
            <div ref={videoRef} className="w-full h-full" />
            
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <Monitor className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-6">Ready to share your screen?</p>
                  <Button onClick={startScreenShare} className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6 text-xl">
                    <Video className="w-6 h-6 mr-2" />
                    Start Streaming
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="w-full lg:w-96 bg-gradient-to-b from-gray-900 to-black border-l border-white/10 flex flex-col max-h-[400px] lg:max-h-full">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-bold">💬 Live Chat</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`rounded-lg p-3 ${msg.is_priority ? 'bg-purple-600/20 border border-purple-500/30' : 'bg-white/5'}`}>
                  <p className="text-purple-400 font-bold text-sm">{msg.user_name}</p>
                  <p className="text-white text-sm">{msg.message}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  placeholder="Chat with viewers..."
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
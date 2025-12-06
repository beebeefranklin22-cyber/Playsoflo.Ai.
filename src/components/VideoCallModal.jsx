import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Video, VideoOff, Mic, MicOff, PhoneOff,
  Users, MessageCircle, MoreVertical, Minimize2
} from "lucide-react";

export default function VideoCallModal({ conversation, onClose }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    // Initialize video call
    startVideoCall();

    // Timer
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      stopVideoCall();
    };
  }, []);

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Here you would initialize WebRTC connection
      // For now, this is a UI demonstration
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("Could not access camera/microphone. Please check permissions.");
    }
  };

  const stopVideoCall = () => {
    if (localVideoRef.current?.srcObject) {
      const tracks = localVideoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (localVideoRef.current?.srcObject) {
      const audioTrack = localVideoRef.current.srcObject.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = isMuted;
    }
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    if (localVideoRef.current?.srcObject) {
      const videoTrack = localVideoRef.current.srcObject.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = isVideoOff;
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-24 right-6 z-50"
      >
        <button
          onClick={() => setIsMinimized(false)}
          className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-2xl"
        >
          <Video className="w-6 h-6 text-white" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Remote Video (Main) */}
      <div className="flex-1 relative">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Placeholder when no remote video */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-900">
          <div className="text-center">
            <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-16 h-16 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {conversation.is_group 
                ? conversation.name
                : conversation.participants.find(p => p !== "current_user")}
            </h3>
            <p className="text-white/70">Connecting...</p>
          </div>
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <motion.div
          drag
          dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
          className="absolute top-4 right-4 w-40 h-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20"
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {isVideoOff && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-white" />
            </div>
          )}
        </motion.div>

        {/* Call Info */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-xl rounded-2xl px-4 py-2 border border-white/20">
          <p className="text-white font-mono text-lg">{formatDuration(callDuration)}</p>
        </div>

        {/* Top Actions */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
          <Button
            onClick={() => setIsMinimized(true)}
            size="sm"
            variant="ghost"
            className="bg-black/50 hover:bg-black/70 text-white backdrop-blur-xl"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/90 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
          <Button
            onClick={toggleVideo}
            size="lg"
            variant="ghost"
            className={`w-14 h-14 rounded-full ${
              isVideoOff 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>

          <Button
            onClick={toggleMute}
            size="lg"
            variant="ghost"
            className={`w-14 h-14 rounded-full ${
              isMuted 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            onClick={() => {
              stopVideoCall();
              onClose();
            }}
            size="lg"
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-8 h-8" />
          </Button>

          <Button
            size="lg"
            variant="ghost"
            className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30"
          >
            <MessageCircle className="w-6 h-6" />
          </Button>

          <Button
            size="lg"
            variant="ghost"
            className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30"
          >
            <MoreVertical className="w-6 h-6" />
          </Button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">
            End-to-end encrypted • HD Quality
          </p>
        </div>
      </div>
    </motion.div>
  );
}
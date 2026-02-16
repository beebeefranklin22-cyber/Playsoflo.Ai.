import React, { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Mic, MicOff, X, Users, Eye } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function LiveNewsBroadcast({ newsPost, channelName, currentUser, onEnd }) {
  const [client] = useState(() => AgoraRTC.createClient({ mode: "live", codec: "vp8" }));
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const localVideoRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        await client.setClientRole("host");
        
        const appId = import.meta.env.VITE_AGORA_APP_ID || "";
        await client.join(appId, channelName, null, null);

        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: "720p_2"
        });
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();

        setLocalVideoTrack(videoTrack);
        setLocalAudioTrack(audioTrack);

        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        await client.publish([videoTrack, audioTrack]);
        toast.success('Live broadcast started!');

        // Update viewer count
        const updateViewers = setInterval(async () => {
          const members = await client.remoteUsers.length;
          setViewerCount(members);
          await base44.entities.NewsPost.update(newsPost.id, {
            live_viewers: members
          });
        }, 5000);

        return () => clearInterval(updateViewers);
      } catch (error) {
        console.error('Error starting broadcast:', error);
        toast.error('Failed to start broadcast');
      }
    };

    init();

    return () => {
      localVideoTrack?.close();
      localAudioTrack?.close();
      client.leave();
    };
  }, []);

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const endBroadcast = async () => {
    try {
      await base44.entities.NewsPost.update(newsPost.id, {
        is_live: false,
        live_ended_at: new Date().toISOString()
      });
      
      localVideoTrack?.close();
      localAudioTrack?.close();
      await client.leave();
      
      toast.success('Broadcast ended');
      onEnd();
    } catch (error) {
      console.error('Error ending broadcast:', error);
      toast.error('Failed to end broadcast');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video Preview */}
      <div ref={localVideoRef} className="w-full h-full" />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-3 py-1 bg-red-600 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-sm font-bold">LIVE</span>
              </div>
              <div className="px-3 py-1 bg-white/20 backdrop-blur-xl rounded-full flex items-center gap-2">
                <Eye className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-bold">{viewerCount}</span>
              </div>
            </div>
            <h2 className="text-white font-bold text-lg">{newsPost.title}</h2>
            <p className="text-gray-300 text-sm">{newsPost.category}</p>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={toggleVideo}
            className={`rounded-full w-14 h-14 ${
              isVideoEnabled ? 'bg-white/20' : 'bg-red-600'
            }`}
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>

          <Button
            size="lg"
            onClick={toggleAudio}
            className={`rounded-full w-14 h-14 ${
              isAudioEnabled ? 'bg-white/20' : 'bg-red-600'
            }`}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>

          <Button
            size="lg"
            onClick={endBroadcast}
            className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
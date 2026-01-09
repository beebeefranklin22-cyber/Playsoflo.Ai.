import React, { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { Loader2, Video, AlertCircle, Mic, MicOff, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AgoraVideoPlayer({ channelName, role = "audience", onViewerJoin }) {
  const [client] = useState(() => AgoraRTC.createClient({ mode: "live", codec: "vp8" }));
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState({});
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoContainerRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get Agora token from backend
        const { base44 } = await import("@/api/base44Client");
        const response = await base44.functions.invoke('generateAgoraToken', {
          channelName,
          role: role === "host" ? "broadcaster" : "audience"
        });

        if (response.error) {
          throw new Error(response.error);
        }

        const { token, uid, appId } = response.data || response;

        // Set client role
        if (role === "host") {
          await client.setClientRole("host");
        } else {
          await client.setClientRole("audience");
        }

        // Join channel
        await client.join(appId, channelName, token, uid);
        setIsJoined(true);

        // If host, create and publish tracks with HD settings
        if (role === "host") {
          try {
            // Request camera and microphone permissions
            const videoTrack = await AgoraRTC.createCameraVideoTrack({
              encoderConfig: {
                width: { ideal: 1920, max: 1920 },
                height: { ideal: 1080, max: 1080 },
                frameRate: { ideal: 30, max: 30 },
                bitrateMin: 1000,
                bitrateMax: 3000,
              },
              optimizationMode: "detail"
            });

            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
              encoderConfig: "high_quality_stereo",
            });

            setLocalVideoTrack(videoTrack);
            setLocalAudioTrack(audioTrack);

            // Play local video immediately
            await new Promise(resolve => setTimeout(resolve, 100));
            if (localVideoRef.current) {
              videoTrack.play(localVideoRef.current, { fit: "cover" });
            }

            // Publish tracks
            await client.publish([videoTrack, audioTrack]);
            toast.success("You're now live!");
          } catch (mediaError) {
            console.error("Media device error:", mediaError);
            throw new Error("Camera/microphone access denied. Please allow permissions and refresh.");
          }
        }

        // Handle remote users
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          
          if (mediaType === "video") {
            setRemoteUsers(prev => ({ ...prev, [user.uid]: user }));
            
            // Play remote video in container
            if (remoteVideoContainerRef.current) {
              const playerDiv = document.createElement("div");
              playerDiv.id = `player-${user.uid}`;
              playerDiv.style.width = "100%";
              playerDiv.style.height = "100%";
              remoteVideoContainerRef.current.innerHTML = "";
              remoteVideoContainerRef.current.appendChild(playerDiv);
              user.videoTrack?.play(playerDiv);
            }
          }
          
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        });

        client.on("user-unpublished", (user, mediaType) => {
          if (mediaType === "video") {
            setRemoteUsers(prev => {
              const newUsers = { ...prev };
              delete newUsers[user.uid];
              return newUsers;
            });
          }
        });

        client.on("user-left", (user) => {
          setRemoteUsers(prev => {
            const newUsers = { ...prev };
            delete newUsers[user.uid];
            return newUsers;
          });
        });

        if (onViewerJoin) {
          client.on("user-joined", (user) => {
            onViewerJoin(user.uid);
          });
        }

        setIsLoading(false);

      } catch (err) {
        console.error("Failed to initialize Agora:", err);
        setError(err.message || "Failed to join stream");
        setIsLoading(false);
        toast.error("Failed to connect to stream: " + err.message);
      }
    };

    init();

    // Cleanup
    return () => {
      localVideoTrack?.close();
      localAudioTrack?.close();
      client.leave();
      setIsJoined(false);
    };
  }, [channelName, role]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-sm">Connecting to stream...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center p-6">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white text-sm mb-2">Connection Error</p>
          <p className="text-gray-400 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  const toggleMute = () => {
    if (localAudioTrack) {
      localAudioTrack.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localVideoTrack) {
      localVideoTrack.setEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      {role === "host" ? (
        <>
          <div ref={localVideoRef} className="w-full h-full" style={{ backgroundColor: '#000' }} />
          
          {/* Host Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <Button
              onClick={toggleMute}
              size="icon"
              className={`rounded-full ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-white/20 hover:bg-white/30'}`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button
              onClick={toggleVideo}
              size="icon"
              className={`rounded-full ${isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-white/20 hover:bg-white/30'}`}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div ref={remoteVideoContainerRef} className="w-full h-full" style={{ backgroundColor: '#000' }} />
          {Object.keys(remoteUsers).length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
              <div className="text-center">
                <Video className="w-16 h-16 text-white/40 mx-auto mb-4 animate-pulse" />
                <p className="text-white/80 text-lg font-semibold mb-2">Waiting for broadcaster...</p>
                <p className="text-white/60 text-sm">The stream will start shortly</p>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* HD Badge */}
      <div className="absolute top-4 right-4 bg-green-500/20 border border-green-500/50 text-green-300 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
        HD 1080p
      </div>

      {/* Live Indicator */}
      {isJoined && (
        <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          {role === "host" ? "BROADCASTING" : "LIVE"}
        </div>
      )}
    </div>
  );
}
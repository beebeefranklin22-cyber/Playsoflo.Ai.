import React, { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { Loader2, Video, AlertCircle, Mic, MicOff, VideoOff, RefreshCw } from "lucide-react";
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
  const [cameraFacing, setCameraFacing] = useState("user"); // 'user' = front, 'environment' = back
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

        // If host, create and publish tracks
        if (role === "host") {
          try {
            // Request permissions first
            console.log("Requesting camera and microphone permissions...");
            
            // Create video track with fallback options
            let videoTrack;
            try {
              // Try with facingMode first (mobile)
              videoTrack = await AgoraRTC.createCameraVideoTrack({
                facingMode: cameraFacing,
                encoderConfig: {
                  width: { ideal: 1280, min: 640 },
                  height: { ideal: 720, min: 480 },
                  frameRate: { ideal: 30, min: 15 },
                  bitrateMin: 400,
                  bitrateMax: 1000,
                },
                optimizationMode: "detail"
              });
            } catch (e) {
              console.log("FacingMode failed, trying default camera...", e);
              // Fallback to default camera
              videoTrack = await AgoraRTC.createCameraVideoTrack({
                encoderConfig: {
                  width: 640,
                  height: 480,
                  frameRate: 30,
                }
              });
            }

            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
              encoderConfig: "music_standard",
            });

            console.log("✅ Media tracks created successfully");
            setLocalVideoTrack(videoTrack);
            setLocalAudioTrack(audioTrack);

            // Wait for container to be ready
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (localVideoRef.current) {
              console.log("📹 Playing video in container, size:", {
                width: localVideoRef.current.offsetWidth,
                height: localVideoRef.current.offsetHeight
              });
              
              // Play video track
              videoTrack.play(localVideoRef.current, { 
                fit: "cover",
                mirror: cameraFacing === "user"
              });
              console.log("✅ Video preview started");
            } else {
              console.error("❌ Video container not found!");
            }

            // Publish to channel
            await client.publish([videoTrack, audioTrack]);
            console.log("✅ Stream published to channel");
            toast.success("🔴 You're now LIVE!");
            
          } catch (mediaError) {
            console.error("❌ Media access error:", mediaError);
            let errorMsg = "Failed to access camera/microphone";
            
            if (mediaError.message?.includes("Permission denied")) {
              errorMsg = "Camera or microphone access denied. Please allow permissions and refresh.";
            } else if (mediaError.message?.includes("not found")) {
              errorMsg = "No camera or microphone found. Please connect devices.";
            } else {
              errorMsg = mediaError.message || errorMsg;
            }
            
            setError(errorMsg);
            toast.error(errorMsg);
            throw mediaError;
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

  const switchCamera = async () => {
    if (!localVideoTrack) return;
    
    try {
      const newFacing = cameraFacing === "user" ? "environment" : "user";
      
      // Capture the current track before state update
      const oldTrack = localVideoTrack;
      
      // Unpublish old track first
      await client.unpublish([oldTrack]);
      oldTrack.stop();
      oldTrack.close();
      
      // Create new track with opposite facing mode
      const newVideoTrack = await AgoraRTC.createCameraVideoTrack({
        facingMode: newFacing,
        encoderConfig: { width: 640, height: 480, frameRate: 30 }
      });
      
      // Play in container
      if (localVideoRef.current) {
        newVideoTrack.play(localVideoRef.current, { fit: "cover", mirror: newFacing === "user" });
      }
      
      // Publish new track
      await client.publish([newVideoTrack]);
      
      // Update state after everything is set up
      setLocalVideoTrack(newVideoTrack);
      setCameraFacing(newFacing);
      
      toast.success(`Switched to ${newFacing === "user" ? "front" : "back"} camera`);
    } catch (err) {
      console.error("Camera switch error:", err);
      toast.error("Failed to switch camera: " + err.message);
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      {role === "host" ? (
        <>
          <div 
            ref={localVideoRef} 
            className="w-full h-full absolute inset-0"
            style={{ 
              backgroundColor: '#000',
              width: '100%',
              height: '100%'
            }} 
          />
          
          {!localVideoTrack && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                <p className="text-white">Initializing camera...</p>
                <p className="text-gray-400 text-sm mt-2">Please allow camera and microphone access</p>
              </div>
            </div>
          )}
          
          {/* Host Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
            <Button
              onClick={toggleMute}
              size="icon"
              className={`rounded-full ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'}`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button
              onClick={toggleVideo}
              size="icon"
              className={`rounded-full ${isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'}`}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>
            <Button
              onClick={switchCamera}
              size="icon"
              className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              title={`Switch to ${cameraFacing === "user" ? "back" : "front"} camera`}
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div 
            ref={remoteVideoContainerRef} 
            className="w-full h-full absolute inset-0" 
            style={{ 
              backgroundColor: '#000',
              width: '100%',
              height: '100%'
            }} 
          />
          {Object.keys(remoteUsers).length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 z-10">
              <div className="text-center">
                <Video className="w-16 h-16 text-white/40 mx-auto mb-4 animate-pulse" />
                <p className="text-white/80 text-lg font-semibold mb-2">Waiting for broadcaster...</p>
                <p className="text-white/60 text-sm">The stream will start shortly</p>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Camera Facing Badge (for host only) */}
      {role === "host" && localVideoTrack && (
        <div className="absolute top-4 right-4 bg-purple-500/20 border border-purple-500/50 text-purple-300 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm z-20">
          {cameraFacing === "user" ? "Front Camera" : "Back Camera"}
        </div>
      )}

      {/* Live Indicator */}
      {isJoined && (
        <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 z-20">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          {role === "host" ? "BROADCASTING" : "LIVE"}
        </div>
      )}
    </div>
  );
}
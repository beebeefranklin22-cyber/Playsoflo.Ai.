import React, { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { Loader2, Video, AlertCircle, Mic, MicOff, VideoOff, RefreshCw, Camera, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AgoraVideoPlayer({ channelName, role = "audience", onViewerJoin, preferredDeviceId = null }) {
  const [client] = useState(() => AgoraRTC.createClient({ mode: "live", codec: "vp8" }));
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState({});
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("user");
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState(preferredDeviceId || null);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState(null);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoContainerRef = useRef(null);

  // Enumerate devices for IRL camera / device selection
  useEffect(() => {
    if (role !== "host") return;
    const loadDevices = async () => {
      try {
        // Trigger permission prompt first so labels are available
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => {});
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevices = devices.filter(d => d.kind === 'videoinput');
        const aDevices = devices.filter(d => d.kind === 'audioinput');
        setVideoDevices(vDevices);
        setAudioDevices(aDevices);
        // Default to first device if none selected
        if (!selectedVideoDevice && vDevices.length > 0) setSelectedVideoDevice(vDevices[0].deviceId);
        if (!selectedAudioDevice && aDevices.length > 0) setSelectedAudioDevice(aDevices[0].deviceId);
      } catch (e) {
        console.warn('Could not enumerate devices:', e);
      }
    };
    loadDevices();
  }, [role]);

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
            let videoTrack;
            // Build video config — prefer selectedDeviceId (IRL cam / USB cam) over facingMode
            const videoConfig = {
              encoderConfig: {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                frameRate: { ideal: 30, min: 15 },
                bitrateMin: 400,
                bitrateMax: 2000,
              },
              optimizationMode: "detail"
            };
            if (selectedVideoDevice) {
              videoConfig.cameraId = selectedVideoDevice;
            } else {
              videoConfig.facingMode = cameraFacing;
            }

            try {
              videoTrack = await AgoraRTC.createCameraVideoTrack(videoConfig);
            } catch (e) {
              console.log("Primary camera failed, falling back to default:", e);
              videoTrack = await AgoraRTC.createCameraVideoTrack({
                encoderConfig: { width: 640, height: 480, frameRate: 30 }
              });
            }

            const audioConfig = { encoderConfig: "music_standard" };
            if (selectedAudioDevice) audioConfig.microphoneId = selectedAudioDevice;
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack(audioConfig);

            setLocalVideoTrack(videoTrack);
            setLocalAudioTrack(audioTrack);

            await new Promise(resolve => setTimeout(resolve, 300));
            
            if (localVideoRef.current) {
              videoTrack.play(localVideoRef.current, { 
                fit: "cover",
                mirror: !selectedVideoDevice && cameraFacing === "user"
              });
            }

            await client.publish([videoTrack, audioTrack]);
            toast.success("🔴 You're now LIVE!");
            
          } catch (mediaError) {
            console.error("❌ Media access error:", mediaError);
            let errorMsg = "Failed to access camera/microphone";
            if (mediaError.message?.includes("Permission denied")) {
              errorMsg = "Camera/microphone access denied. Please allow permissions and refresh.";
            } else if (mediaError.message?.includes("not found")) {
              errorMsg = "No camera or microphone found. Please connect your device.";
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
      const oldTrack = localVideoTrack;
      await client.unpublish([oldTrack]);
      oldTrack.stop();
      oldTrack.close();
      const newVideoTrack = await AgoraRTC.createCameraVideoTrack({
        facingMode: newFacing,
        encoderConfig: { width: 640, height: 480, frameRate: 30 }
      });
      if (localVideoRef.current) {
        newVideoTrack.play(localVideoRef.current, { fit: "cover", mirror: newFacing === "user" });
      }
      await client.publish([newVideoTrack]);
      setLocalVideoTrack(newVideoTrack);
      setCameraFacing(newFacing);
      toast.success(`Switched to ${newFacing === "user" ? "front" : "back"} camera`);
    } catch (err) {
      toast.error("Failed to switch camera: " + err.message);
    }
  };

  const switchToDevice = async (deviceId) => {
    if (!localVideoTrack) return;
    try {
      const oldTrack = localVideoTrack;
      await client.unpublish([oldTrack]);
      oldTrack.stop();
      oldTrack.close();
      const newVideoTrack = await AgoraRTC.createCameraVideoTrack({
        cameraId: deviceId,
        encoderConfig: { width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 }, frameRate: 30, bitrateMax: 2000 }
      });
      if (localVideoRef.current) {
        newVideoTrack.play(localVideoRef.current, { fit: "cover", mirror: false });
      }
      await client.publish([newVideoTrack]);
      setLocalVideoTrack(newVideoTrack);
      setSelectedVideoDevice(deviceId);
      setShowDevicePicker(false);
      const device = videoDevices.find(d => d.deviceId === deviceId);
      toast.success(`Camera switched to: ${device?.label || 'Selected device'}`);
    } catch (err) {
      toast.error("Failed to switch device: " + err.message);
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
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20 flex-wrap justify-center px-4">
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
              title="Flip camera"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
            {/* Device picker — shows all connected cameras including IRL cams */}
            {videoDevices.length > 1 && (
              <div className="relative">
                <Button
                  onClick={() => setShowDevicePicker(v => !v)}
                  size="sm"
                  className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center gap-1.5 px-3"
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-xs">Camera</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
                {showDevicePicker && (
                  <div className="absolute bottom-12 left-0 w-64 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-30">
                    <p className="text-gray-400 text-xs px-3 pt-2 pb-1 font-semibold uppercase tracking-wide">Select Camera Source</p>
                    {videoDevices.map(device => (
                      <button
                        key={device.deviceId}
                        onClick={() => switchToDevice(device.deviceId)}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-white/10 transition flex items-center gap-2 ${selectedVideoDevice === device.deviceId ? 'text-purple-400 bg-purple-500/10' : 'text-white'}`}
                      >
                        <Camera className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{device.label || `Camera ${videoDevices.indexOf(device) + 1}`}</span>
                        {selectedVideoDevice === device.deviceId && <span className="ml-auto text-xs text-purple-400">✓ Active</span>}
                      </button>
                    ))}
                    <div className="px-3 py-2 border-t border-white/10">
                      <p className="text-gray-500 text-xs">IRL cameras (GoPro, Sony ZV-1, OBSBOT, etc.) appear here when connected via USB</p>
                    </div>
                  </div>
                )}
              </div>
            )}
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
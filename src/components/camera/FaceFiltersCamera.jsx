import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Sparkles, RotateCcw, Download, Video, Square } from "lucide-react";

const FILTERS = [
  {
    id: "none",
    label: "Normal",
    emoji: "🎥",
    style: "",
    description: "No filter"
  },
  {
    id: "glamour",
    label: "Glamour",
    emoji: "✨",
    style: "brightness(1.15) contrast(1.05) saturate(1.3)",
    overlay: null,
    description: "Soft beauty glow"
  },
  {
    id: "golden_hour",
    label: "Golden Hour",
    emoji: "🌅",
    style: "sepia(0.35) saturate(1.6) brightness(1.1) contrast(1.05)",
    description: "Warm sunset tones"
  },
  {
    id: "cool_blue",
    label: "Ice Blue",
    emoji: "❄️",
    style: "saturate(0.8) hue-rotate(190deg) brightness(1.05) contrast(1.1)",
    description: "Cool cinematic look"
  },
  {
    id: "vivid",
    label: "Vivid",
    emoji: "🌈",
    style: "saturate(2) contrast(1.1) brightness(1.05)",
    description: "Bold vibrant colors"
  },
  {
    id: "noir",
    label: "Noir",
    emoji: "🎭",
    style: "grayscale(1) contrast(1.3) brightness(0.95)",
    description: "Classic black & white"
  },
  {
    id: "soft_glow",
    label: "Soft Glow",
    emoji: "🌸",
    style: "brightness(1.2) contrast(0.9) saturate(1.2) blur(0px)",
    overlayClass: "bg-pink-400/10",
    description: "Dreamy soft look"
  },
  {
    id: "neon",
    label: "Neon",
    emoji: "💜",
    style: "saturate(2.5) hue-rotate(270deg) brightness(1.1) contrast(1.2)",
    description: "Electric neon glow"
  },
  {
    id: "vintage",
    label: "Vintage",
    emoji: "📷",
    style: "sepia(0.6) contrast(1.1) brightness(0.9) saturate(0.8)",
    overlayClass: "bg-amber-900/10",
    description: "Old school film"
  },
  {
    id: "dramatic",
    label: "Dramatic",
    emoji: "🎬",
    style: "contrast(1.5) brightness(0.85) saturate(1.2)",
    description: "High contrast cinematic"
  }
];

// Sticker overlays that appear on the video
const STICKERS = [
  { id: "stars", emoji: "⭐", label: "Stars" },
  { id: "hearts", emoji: "❤️", label: "Hearts" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "crown", emoji: "👑", label: "Crown" },
  { id: "sunglasses", emoji: "😎", label: "Cool" },
  { id: "sparkles", emoji: "✨", label: "Sparkle" },
  { id: "rainbow", emoji: "🌈", label: "Rainbow" },
  { id: "music", emoji: "🎵", label: "Music" },
];

export default function FaceFiltersCamera({ onClose, onCapture, mode = "photo" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [activeSticker, setActiveSticker] = useState(null);
  const [facing, setFacing] = useState("user");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === "video"
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch (err) {
      setError("Camera access denied. Please allow camera access.");
    }
  }, [facing, mode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCamera]);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.filter = activeFilter.style || "none";
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      setCapturedMedia({ url, type: "image", blob });
    }, "image/jpeg", 0.95);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm;codecs=vp9,opus" });
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setCapturedMedia({ url, type: "video", blob });
    };
    recorder.start(100);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const handleUse = () => {
    if (capturedMedia && onCapture) {
      onCapture(capturedMedia);
    }
    onClose();
  };

  const retake = () => {
    setCapturedMedia(null);
    startCamera();
  };

  const formatTime = s => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 z-10">
        <button onClick={onClose} className="p-2 bg-black/40 rounded-full">
          <X className="w-6 h-6 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span className="text-white font-bold">Face Filters</span>
        </div>
        <button onClick={() => setFacing(f => f === "user" ? "environment" : "user")} className="p-2 bg-black/40 rounded-full">
          <RotateCcw className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Camera / Preview */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-red-400 text-center px-8">{error}</p>
          </div>
        ) : capturedMedia ? (
          capturedMedia.type === "image" ? (
            <img src={capturedMedia.url} className="w-full h-full object-cover" alt="captured" />
          ) : (
            <video src={capturedMedia.url} className="w-full h-full object-cover" controls autoPlay loop />
          )
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                transform: facing === "user" ? "scaleX(-1)" : "none",
                filter: activeFilter.style || "none",
              }}
            />
            {/* Filter color overlay */}
            {activeFilter.overlayClass && (
              <div className={`absolute inset-0 pointer-events-none ${activeFilter.overlayClass}`} />
            )}
            {/* Sticker overlay */}
            {activeSticker && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-8xl opacity-80 animate-pulse">{activeSticker.emoji}</span>
              </div>
            )}
          </>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-600/90 rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white font-mono font-bold">{formatTime(recordingTime)}</span>
          </div>
        )}

        {/* Active filter label */}
        {!capturedMedia && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-white text-sm font-medium">{activeFilter.emoji} {activeFilter.label}</span>
          </div>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Bottom Controls */}
      {capturedMedia ? (
        <div className="bg-black px-6 py-6 flex items-center gap-4">
          <button
            onClick={retake}
            className="flex-1 py-3 border border-white/30 rounded-full text-white font-semibold"
          >
            Retake
          </button>
          <button
            onClick={handleUse}
            className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-bold"
          >
            Use {capturedMedia.type === "image" ? "Photo" : "Video"}
          </button>
        </div>
      ) : (
        <>
          {/* Stickers row */}
          <div className="flex gap-3 px-4 py-2 overflow-x-auto hide-scrollbar">
            {STICKERS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSticker(activeSticker?.id === s.id ? null : s)}
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl transition ${
                  activeSticker?.id === s.id ? "bg-purple-600/50 ring-2 ring-purple-400" : "bg-white/10"
                }`}
              >
                {s.emoji}
              </button>
            ))}
          </div>

          {/* Filter Strip */}
          <div className="flex gap-3 px-4 py-2 overflow-x-auto hide-scrollbar">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 transition`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xl transition ${
                  activeFilter.id === f.id ? "ring-2 ring-purple-400 scale-110" : "opacity-70"
                }`}>
                  {f.emoji}
                </div>
                <span className={`text-xs font-medium ${activeFilter.id === f.id ? "text-purple-400" : "text-gray-400"}`}>
                  {f.label}
                </span>
              </button>
            ))}
          </div>

          {/* Capture Button */}
          <div className="flex items-center justify-center py-6 px-4 gap-8">
            {mode === "video" ? (
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
                  isRecording
                    ? "border-red-500 bg-red-500 scale-110"
                    : "border-white bg-white/20"
                }`}
              >
                {isRecording
                  ? <Square className="w-8 h-8 text-white fill-white" />
                  : <Video className="w-8 h-8 text-white" />}
              </button>
            ) : (
              <button
                onClick={takePhoto}
                disabled={!cameraReady}
                className="w-20 h-20 rounded-full border-4 border-white bg-white/20 flex items-center justify-center hover:bg-white/30 active:scale-95 transition disabled:opacity-50"
              >
                <Camera className="w-8 h-8 text-white" />
              </button>
            )}
          </div>
        </>
      )}

      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </motion.div>
  );
}
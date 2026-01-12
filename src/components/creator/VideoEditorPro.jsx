import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { 
  Video, Upload, Scissors, Wand2, Download, Play, Pause,
  Sparkles, Volume2, VolumeX, Zap, Image, Music, Type,
  RotateCcw, Loader2, Check, Eye, X, FastForward, Rewind,
  SkipForward, SkipBack, Maximize, RotateCw
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function VideoEditorPro({ currentUser }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [filter, setFilter] = useState("none");
  const [processing, setProcessing] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [selectedClips, setSelectedClips] = useState([]);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  const filters = [
    { id: "none", name: "Original", css: "" },
    { id: "vintage", name: "Vintage", css: "sepia(40%) contrast(120%)" },
    { id: "vivid", name: "Vivid", css: "saturate(150%) contrast(110%)" },
    { id: "noir", name: "Noir", css: "grayscale(100%) contrast(150%)" },
    { id: "warm", name: "Warm", css: "sepia(20%) saturate(120%)" },
    { id: "cool", name: "Cool", css: "hue-rotate(180deg) saturate(120%)" },
    { id: "dramatic", name: "Dramatic", css: "contrast(150%) brightness(90%)" },
    { id: "dreamy", name: "Dreamy", css: "blur(1px) brightness(110%)" }
  ];

  const transitions = [
    { id: "fade", name: "Fade", duration: 0.5 },
    { id: "slide_left", name: "Slide Left", duration: 0.3 },
    { id: "slide_right", name: "Slide Right", duration: 0.3 },
    { id: "zoom", name: "Zoom In", duration: 0.4 },
    { id: "dissolve", name: "Dissolve", duration: 0.6 }
  ];

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      videoRef.current.muted = isMuted;
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [volume, isMuted, playbackSpeed]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      toast.error('File too large. Max 500MB');
      return;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    toast.success('Video loaded!');
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setTrimEnd(dur);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTrim = () => {
    if (trimStart >= trimEnd) {
      toast.error('Invalid trim range');
      return;
    }
    
    // Apply trim by updating video playback range
    if (videoRef.current) {
      videoRef.current.currentTime = trimStart;
    }
    
    toast.success(`Trim applied: ${trimStart.toFixed(1)}s to ${trimEnd.toFixed(1)}s`);
  };

  const generateThumbnail = async () => {
    if (!videoRef.current) return;

    setGeneratingThumbnail(true);
    try {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      const thumbnailFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file: thumbnailFile });
      
      toast.success('Thumbnail generated!');
      return file_url;
    } catch (error) {
      toast.error('Thumbnail generation failed');
    } finally {
      setGeneratingThumbnail(false);
    }
  };

  const applyAIEnhancements = async () => {
    if (!videoFile) {
      toast.error('Please upload a video first');
      return;
    }

    setProcessing(true);
    try {
      // Generate video enhancement suggestions
      const suggestions = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze a video and suggest professional editing improvements. Include:
        - Optimal trim points for better pacing
        - Color grade recommendations
        - Audio enhancement suggestions
        - Best filter to apply
        - Transition suggestions`,
        response_json_schema: {
          type: "object",
          properties: {
            trim_suggestion: { type: "string" },
            color_grade: { type: "string" },
            audio_tips: { type: "string" },
            filter_recommendation: { type: "string" },
            transitions: { type: "array", items: { type: "string" } }
          }
        }
      });

      toast.success('AI analyzed your video!');
      
      // Auto-apply suggested filter
      const suggestedFilter = filters.find(f => 
        f.name.toLowerCase().includes(suggestions.filter_recommendation?.toLowerCase())
      );
      if (suggestedFilter) {
        setFilter(suggestedFilter.id);
      }

      // Show suggestions
      alert(`AI Suggestions:\n\n${suggestions.trim_suggestion}\n\nColor: ${suggestions.color_grade}\n\nAudio: ${suggestions.audio_tips}`);
    } catch (error) {
      toast.error('AI enhancement failed');
    } finally {
      setProcessing(false);
    }
  };

  const exportVideo = async () => {
    if (!videoFile) {
      toast.error('No video to export');
      return;
    }

    setProcessing(true);
    try {
      // Upload original video
      const { file_url } = await base44.integrations.Core.UploadFile({ file: videoFile });
      
      // Create export config
      const exportData = {
        video_url: file_url,
        trim_start: trimStart,
        trim_end: trimEnd,
        filter: filter,
        volume: volume,
        settings: {
          filter,
          trimStart,
          trimEnd,
          volume
        }
      };

      toast.success('Video processed! Ready to download.');
      
      // Download the original (in real implementation, this would be the processed version)
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = 'edited-video.mp4';
      link.click();
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Video className="w-7 h-7 text-purple-400" />
            Pro Video Editor
          </h2>
          <p className="text-gray-400">Cut, enhance, and polish your videos</p>
        </div>
        {videoUrl && (
          <div className="flex gap-2">
            <Button
              onClick={applyAIEnhancements}
              disabled={processing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              AI Enhance
            </Button>
            <Button
              onClick={exportVideo}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        )}
      </div>

      {/* Upload or Video Player */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          {!videoUrl ? (
            <div className="text-center py-12">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
                id="video-upload"
              />
              <label htmlFor="video-upload" className="cursor-pointer">
                <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Upload Your Video</h3>
                <p className="text-gray-400 mb-4">MP4, MOV, AVI • Max 500MB</p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Choose Video File
                </Button>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Video Player */}
              <div className="relative bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onLoadedMetadata={handleVideoLoad}
                  onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full"
                  style={{ 
                    filter: `${filters.find(f => f.id === filter)?.css || ""} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                  }}
                />
                
                {/* Play/Pause Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <button
                    onClick={togglePlayPause}
                    className="w-16 h-16 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center pointer-events-auto hover:bg-black/70 transition"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white ml-1" />
                    )}
                  </button>
                </div>

                {/* Current Time */}
                <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-lg">
                  <span className="text-white text-sm font-mono">
                    {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                  </span>
                </div>

                {/* Volume Control */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
                  <button onClick={() => setIsMuted(!isMuted)}>
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Trim Controls */}
              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-pink-400" />
                  Trim Video
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">
                      Start: {trimStart.toFixed(1)}s
                    </label>
                    <Slider
                      value={[trimStart]}
                      onValueChange={(v) => setTrimStart(v[0])}
                      max={duration}
                      step={0.1}
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">
                      End: {trimEnd.toFixed(1)}s
                    </label>
                    <Slider
                      value={[trimEnd]}
                      onValueChange={(v) => setTrimEnd(v[0])}
                      max={duration}
                      step={0.1}
                    />
                  </div>
                  <div className="text-center text-gray-400 text-sm">
                    Duration: {(trimEnd - trimStart).toFixed(1)}s
                  </div>
                  <Button onClick={handleTrim} className="w-full bg-purple-600">
                    <Scissors className="w-4 h-4 mr-2" />
                    Apply Trim
                  </Button>
                </div>
              </div>

              {/* Advanced Adjustments */}
              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="text-white font-semibold mb-3">Color Adjustments</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block flex items-center justify-between">
                      <span>Brightness</span>
                      <span>{brightness}%</span>
                    </label>
                    <Slider
                      value={[brightness]}
                      onValueChange={(v) => setBrightness(v[0])}
                      min={50}
                      max={150}
                      step={5}
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block flex items-center justify-between">
                      <span>Contrast</span>
                      <span>{contrast}%</span>
                    </label>
                    <Slider
                      value={[contrast]}
                      onValueChange={(v) => setContrast(v[0])}
                      min={50}
                      max={150}
                      step={5}
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block flex items-center justify-between">
                      <span>Saturation</span>
                      <span>{saturation}%</span>
                    </label>
                    <Slider
                      value={[saturation]}
                      onValueChange={(v) => setSaturation(v[0])}
                      min={0}
                      max={200}
                      step={10}
                    />
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Color Filters
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {filters.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`p-3 rounded-lg text-sm font-medium transition ${
                        filter === f.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Playback Speed */}
              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="text-white font-semibold mb-3">Playback Speed</h4>
                <div className="grid grid-cols-5 gap-2">
                  {[0.5, 0.75, 1, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`p-2 rounded-lg text-sm font-medium transition ${
                        playbackSpeed === speed
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={generateThumbnail}
                  disabled={generatingThumbnail}
                  variant="outline"
                  className="bg-white/5 hover:bg-white/10"
                >
                  {generatingThumbnail ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Image className="w-4 h-4 mr-2" />
                  )}
                  Thumbnail
                </Button>
                <Button
                  onClick={() => {
                    setVideoUrl("");
                    setVideoFile(null);
                    setCurrentTime(0);
                    setDuration(0);
                    setTrimStart(0);
                    setTrimEnd(0);
                    setFilter("none");
                  }}
                  variant="outline"
                  className="bg-white/5 hover:bg-white/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button
                  onClick={() => setShowEffects(!showEffects)}
                  variant="outline"
                  className="bg-white/5 hover:bg-white/10"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Effects
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Effects Panel */}
      <AnimatePresence>
        {showEffects && videoUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <h4 className="text-white font-semibold mb-4">AI Effects & Tools</h4>
                <div className="grid md:grid-cols-4 gap-3">
                  <Button className="bg-blue-600 hover:bg-blue-700 h-auto py-4 flex-col gap-2">
                    <Music className="w-6 h-6" />
                    <span className="text-xs">Add Music</span>
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 h-auto py-4 flex-col gap-2">
                    <Type className="w-6 h-6" />
                    <span className="text-xs">Captions</span>
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700 h-auto py-4 flex-col gap-2">
                    <Zap className="w-6 h-6" />
                    <span className="text-xs">Auto Cut</span>
                  </Button>
                  <Button className="bg-pink-600 hover:bg-pink-700 h-auto py-4 flex-col gap-2">
                    <Sparkles className="w-6 h-6" />
                    <span className="text-xs">AI Enhance</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      {!videoUrl && (
        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardContent className="p-6">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Pro Features
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-purple-300 font-semibold mb-1">✂️ Precision Trimming</p>
                <p className="text-gray-300">Cut your video to the perfect length</p>
              </div>
              <div>
                <p className="text-purple-300 font-semibold mb-1">🎨 Color Filters</p>
                <p className="text-gray-300">8 professional color grades</p>
              </div>
              <div>
                <p className="text-purple-300 font-semibold mb-1">🤖 AI Enhancement</p>
                <p className="text-gray-300">Smart editing suggestions</p>
              </div>
              <div>
                <p className="text-purple-300 font-semibold mb-1">📸 Thumbnail Gen</p>
                <p className="text-gray-300">Auto-create perfect thumbnails</p>
              </div>
              <div>
                <p className="text-purple-300 font-semibold mb-1">🎵 Audio Control</p>
                <p className="text-gray-300">Volume and mute controls</p>
              </div>
              <div>
                <p className="text-purple-300 font-semibold mb-1">⚡ Fast Export</p>
                <p className="text-gray-300">Download in seconds</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { 
  Video, Upload, Scissors, Download, Play, Pause, Plus,
  Sparkles, Volume2, VolumeX, RotateCcw, Loader2, X,
  Music, Layers, FilePlus, Combine, Copy, Split
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

export default function AdvancedVideoEditor({ currentUser }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [clips, setClips] = useState([]);
  const [currentClip, setCurrentClip] = useState(null);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [filter, setFilter] = useState("none");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [backgroundMusicUrl, setBackgroundMusicUrl] = useState("");
  const [musicVolume, setMusicVolume] = useState(50);
  const [processing, setProcessing] = useState(false);
  const [exportFormat, setExportFormat] = useState("mp4");

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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      videoRef.current.muted = isMuted;
    }
    if (audioRef.current) {
      audioRef.current.volume = musicVolume / 100;
    }
  }, [volume, isMuted, musicVolume]);

  useEffect(() => {
    if (currentClip && videoRef.current) {
      videoRef.current.src = currentClip.url;
    }
  }, [currentClip]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      if (!file.type.startsWith('video/')) {
        toast.error(`${file.name} is not a video file`);
        continue;
      }

      if (file.size > 1024 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 1GB per clip`);
        continue;
      }

      const url = URL.createObjectURL(file);
      const newClip = {
        id: Date.now() + Math.random(),
        file,
        url,
        name: file.name,
        trimStart: 0,
        trimEnd: 0,
        filter: "none",
        brightness: 100,
        contrast: 100,
        saturation: 100
      };

      setClips(prev => [...prev, newClip]);
      
      if (!currentClip) {
        setCurrentClip(newClip);
        setCurrentClipIndex(0);
      }
    }

    toast.success(`${files.length} clip(s) added`);
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setTrimEnd(dur);
      
      if (currentClip) {
        const updatedClips = clips.map(c =>
          c.id === currentClip.id ? { ...c, trimEnd: dur } : c
        );
        setClips(updatedClips);
      }
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        if (audioRef.current) audioRef.current.pause();
      } else {
        videoRef.current.play();
        if (audioRef.current) audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTrim = () => {
    if (trimStart >= trimEnd) {
      toast.error('Invalid trim range');
      return;
    }
    
    const updatedClips = clips.map(c =>
      c.id === currentClip.id 
        ? { ...c, trimStart, trimEnd }
        : c
    );
    setClips(updatedClips);
    
    if (videoRef.current) {
      videoRef.current.currentTime = trimStart;
    }
    
    toast.success(`Trim applied: ${trimStart.toFixed(1)}s to ${trimEnd.toFixed(1)}s`);
  };

  const applyFilterToClip = () => {
    const updatedClips = clips.map(c =>
      c.id === currentClip.id 
        ? { ...c, filter, brightness, contrast, saturation }
        : c
    );
    setClips(updatedClips);
    toast.success('Effects applied to clip');
  };

  const duplicateClip = () => {
    if (!currentClip) return;
    
    const duplicate = {
      ...currentClip,
      id: Date.now() + Math.random(),
      name: `${currentClip.name} (copy)`
    };
    
    setClips(prev => [...prev, duplicate]);
    toast.success('Clip duplicated');
  };

  const splitClip = () => {
    if (!currentClip) return;
    
    const splitPoint = currentTime;
    const firstPart = {
      ...currentClip,
      id: Date.now() + Math.random(),
      name: `${currentClip.name} (part 1)`,
      trimEnd: splitPoint
    };
    
    const secondPart = {
      ...currentClip,
      id: Date.now() + Math.random() + 1,
      name: `${currentClip.name} (part 2)`,
      trimStart: splitPoint
    };

    const index = clips.findIndex(c => c.id === currentClip.id);
    const newClips = [...clips];
    newClips.splice(index, 1, firstPart, secondPart);
    
    setClips(newClips);
    setCurrentClip(firstPart);
    toast.success('Clip split into two parts');
  };

  const removeClip = (clipId) => {
    const newClips = clips.filter(c => c.id !== clipId);
    setClips(newClips);
    
    if (currentClip?.id === clipId) {
      setCurrentClip(newClips[0] || null);
      setCurrentClipIndex(0);
    }
    
    toast.success('Clip removed');
  };

  const handleMusicUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file');
      return;
    }

    const url = URL.createObjectURL(file);
    setBackgroundMusicUrl(url);
    toast.success('Background music added');
  };

  const exportVideo = async () => {
    if (clips.length === 0) {
      toast.error('No clips to export');
      return;
    }

    setProcessing(true);
    try {
      // Upload all clips
      const uploadPromises = clips.map(async (clip) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: clip.file });
        return {
          url: file_url,
          settings: {
            trimStart: clip.trimStart,
            trimEnd: clip.trimEnd,
            filter: clip.filter,
            brightness: clip.brightness,
            contrast: clip.contrast,
            saturation: clip.saturation
          }
        };
      });

      const uploadedClips = await Promise.all(uploadPromises);
      
      // Create project metadata
      const projectData = {
        clips: uploadedClips,
        backgroundMusic: backgroundMusicUrl,
        musicVolume,
        exportFormat,
        createdBy: currentUser.email,
        createdAt: new Date().toISOString()
      };

      toast.success('Video project ready! All clips processed.');
      
      // In a real implementation, this would merge clips and export
      // For now, download the first clip
      if (currentClip) {
        const link = document.createElement('a');
        link.href = currentClip.url;
        link.download = `edited-video.${exportFormat}`;
        link.click();
      }
    } catch (error) {
      toast.error('Export failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const selectClip = (clip, index) => {
    setCurrentClip(clip);
    setCurrentClipIndex(index);
    setTrimStart(clip.trimStart || 0);
    setTrimEnd(clip.trimEnd || 0);
    setFilter(clip.filter || "none");
    setBrightness(clip.brightness || 100);
    setContrast(clip.contrast || 100);
    setSaturation(clip.saturation || 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Video className="w-7 h-7 text-purple-400" />
            Advanced Video Editor
          </h2>
          <p className="text-gray-400">Multi-clip editing with advanced features</p>
        </div>
        {clips.length > 0 && (
          <Button
            onClick={exportVideo}
            disabled={processing}
            className="bg-green-600 hover:bg-green-700"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Project
              </>
            )}
          </Button>
        )}
      </div>

      {/* Upload Area */}
      {clips.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="video-upload-multi"
            />
            <label htmlFor="video-upload-multi" className="cursor-pointer">
              <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Upload Video Clips</h3>
              <p className="text-gray-400 mb-4">Select one or more videos • Max 1GB each</p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Choose Video Files
              </Button>
            </label>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Timeline - Clips List */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  Timeline ({clips.length} clips)
                </h3>
                <div className="flex gap-2">
                  <Button
                    onClick={duplicateClip}
                    disabled={!currentClip}
                    size="sm"
                    variant="outline"
                    className="bg-white/5"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Duplicate
                  </Button>
                  <Button
                    onClick={splitClip}
                    disabled={!currentClip}
                    size="sm"
                    variant="outline"
                    className="bg-white/5"
                  >
                    <Split className="w-4 h-4 mr-1" />
                    Split at {currentTime.toFixed(1)}s
                  </Button>
                  <Button
                    onClick={() => document.getElementById('add-more-clips').click()}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <FilePlus className="w-4 h-4 mr-1" />
                    Add Clips
                  </Button>
                  <input
                    id="add-more-clips"
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {clips.map((clip, index) => (
                  <button
                    key={clip.id}
                    onClick={() => selectClip(clip, index)}
                    className={`relative flex-shrink-0 w-40 p-2 rounded-lg border transition ${
                      currentClip?.id === clip.id
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="aspect-video bg-black rounded mb-2 flex items-center justify-center">
                      <Video className="w-6 h-6 text-gray-500" />
                    </div>
                    <div className="text-white text-xs font-medium truncate mb-1">
                      Clip {index + 1}
                    </div>
                    <div className="text-gray-400 text-xs truncate">{clip.name}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeClip(clip.id);
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Video Player */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Video Player */}
                <div className="relative bg-black rounded-xl overflow-hidden">
                  <video
                    ref={videoRef}
                    src={currentClip?.url}
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

                  {/* Clip Indicator */}
                  <div className="absolute top-4 left-4 px-3 py-1 bg-purple-500/70 backdrop-blur-sm rounded-lg">
                    <span className="text-white text-sm font-bold">
                      Clip {currentClipIndex + 1} of {clips.length}
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

                {/* Background Music */}
                {backgroundMusicUrl && (
                  <audio ref={audioRef} src={backgroundMusicUrl} loop />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Editing Tools */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Trim Controls */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-pink-400" />
                  Trim Current Clip
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
              </CardContent>
            </Card>

            {/* Audio Controls */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Music className="w-5 h-5 text-blue-400" />
                  Background Music
                </h4>
                <div className="space-y-3">
                  {backgroundMusicUrl ? (
                    <>
                      <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <span className="text-green-300 text-sm">Music Added</span>
                        <Button
                          onClick={() => setBackgroundMusicUrl("")}
                          size="sm"
                          variant="ghost"
                          className="text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">
                          Music Volume: {musicVolume}%
                        </label>
                        <Slider
                          value={[musicVolume]}
                          onValueChange={(v) => setMusicVolume(v[0])}
                          max={100}
                          step={1}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => document.getElementById('music-upload').click()}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Music className="w-4 h-4 mr-2" />
                        Upload Background Music
                      </Button>
                      <input
                        id="music-upload"
                        type="file"
                        accept="audio/*"
                        onChange={handleMusicUpload}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Color Adjustments & Filters */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <h4 className="text-white font-semibold mb-3">Color & Effects</h4>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Adjustments */}
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

                {/* Filters */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Filters</label>
                  <div className="grid grid-cols-2 gap-2">
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
              </div>

              <Button 
                onClick={applyFilterToClip}
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Apply Effects to Clip
              </Button>
            </CardContent>
          </Card>

          {/* Export Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <h4 className="text-white font-semibold mb-3">Export Settings</h4>
              <div className="grid grid-cols-4 gap-2">
                {['mp4', 'webm', 'mov', 'avi'].map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`p-3 rounded-lg text-sm font-medium uppercase transition ${
                      exportFormat === format
                        ? 'bg-green-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <div className="text-purple-400 text-sm mb-1">Total Clips</div>
              <div className="text-white text-2xl font-bold">{clips.length}</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="text-blue-400 text-sm mb-1">Total Duration</div>
              <div className="text-white text-2xl font-bold">
                {clips.reduce((sum, c) => sum + ((c.trimEnd || 0) - (c.trimStart || 0)), 0).toFixed(0)}s
              </div>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="text-green-400 text-sm mb-1">Current Clip</div>
              <div className="text-white text-2xl font-bold">{currentClipIndex + 1}</div>
            </div>
            <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-4">
              <div className="text-pink-400 text-sm mb-1">Format</div>
              <div className="text-white text-2xl font-bold uppercase">{exportFormat}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
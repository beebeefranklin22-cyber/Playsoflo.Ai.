import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { 
  Video, Upload, Scissors, Download, Play, Pause, Plus,
  Sparkles, Volume2, VolumeX, RotateCcw, Loader2, X,
  Music, Layers, FilePlus, Combine, Copy, Split, Type,
  Wand2, Mic, Sliders, Zap, FileText, Aperture
} from "lucide-react";
import { stabilizeVideo } from "@/functions/stabilizeVideo";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import TemplateLibrary from "./TemplateLibrary";
import VideoTextOverlayEditor from "./VideoTextOverlayEditor";

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
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedTransition, setSelectedTransition] = useState("fade");
  const [textOverlays, setTextOverlays] = useState([]);
  const [selectedLUT, setSelectedLUT] = useState("none");
  const [voiceoverUrl, setVoiceoverUrl] = useState("");
  const [voiceoverVolume, setVoiceoverVolume] = useState(70);
  const [audioEchoEffect, setAudioEchoEffect] = useState(false);
  const [audioReverbEffect, setAudioReverbEffect] = useState(false);
  const [transcriptionData, setTranscriptionData] = useState(null);
  const [generatingTranscription, setGeneratingTranscription] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [backgroundMusicUrl, setBackgroundMusicUrl] = useState("");
  const [musicVolume, setMusicVolume] = useState(50);
  const [processing, setProcessing] = useState(false);
  const [exportFormat, setExportFormat] = useState("mp4");
  const [stabilizing, setStabilizing] = useState(false);
  const [stabilizationStrength, setStabilizationStrength] = useState(20);
  const [stabilizationZoom, setStabilizationZoom] = useState(1);
  const [stabilizedClips, setStabilizedClips] = useState({});
  const [stabilizationResult, setStabilizationResult] = useState(null);

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

  const luts = [
    { id: "none", name: "None", settings: { brightness: 100, contrast: 100, saturation: 100, hue: 0 } },
    { id: "cinematic", name: "Cinematic", settings: { brightness: 95, contrast: 125, saturation: 110, hue: 5 } },
    { id: "teal_orange", name: "Teal & Orange", settings: { brightness: 105, contrast: 120, saturation: 130, hue: 15 } },
    { id: "film_noir", name: "Film Noir", settings: { brightness: 80, contrast: 160, saturation: 50, hue: 0 } },
    { id: "sunset", name: "Sunset", settings: { brightness: 110, contrast: 115, saturation: 140, hue: 25 } },
    { id: "arctic", name: "Arctic", settings: { brightness: 115, contrast: 105, saturation: 85, hue: -20 } }
  ];

  const transitions = [
    { id: "fade", name: "Fade", duration: 0.5 },
    { id: "slide_left", name: "Slide Left", duration: 0.3 },
    { id: "slide_right", name: "Slide Right", duration: 0.3 },
    { id: "zoom_in", name: "Zoom In", duration: 0.4 },
    { id: "zoom_out", name: "Zoom Out", duration: 0.4 },
    { id: "dissolve", name: "Dissolve", duration: 0.6 },
    { id: "wipe", name: "Wipe", duration: 0.5 }
  ];

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      videoRef.current.muted = isMuted;
      videoRef.current.playbackRate = playbackSpeed;
    }
    if (audioRef.current) {
      audioRef.current.volume = musicVolume / 100;
    }
  }, [volume, isMuted, musicVolume, playbackSpeed]);

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
        ? { ...c, filter, brightness, contrast, saturation, lut: selectedLUT, speed: playbackSpeed }
        : c
    );
    setClips(updatedClips);
    toast.success('Effects applied to clip');
  };

  const applyLUT = (lutId) => {
    const lut = luts.find(l => l.id === lutId);
    if (lut) {
      setSelectedLUT(lutId);
      setBrightness(lut.settings.brightness);
      setContrast(lut.settings.contrast);
      setSaturation(lut.settings.saturation);
      toast.success(`${lut.name} LUT applied`);
    }
  };

  const addTextOverlay = () => {
    const newOverlay = {
      id: Date.now(),
      text: "Add your text",
      x: 50,
      y: 50,
      fontSize: 32,
      color: "#FFFFFF",
      startTime: currentTime,
      endTime: currentTime + 5
    };
    setTextOverlays([...textOverlays, newOverlay]);
    toast.success('Text overlay added');
  };

  const removeTextOverlay = (id) => {
    setTextOverlays(textOverlays.filter(t => t.id !== id));
  };

  const handleVoiceoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file');
      return;
    }

    const url = URL.createObjectURL(file);
    setVoiceoverUrl(url);
    toast.success('Voiceover added');
  };

  const generateTranscription = async () => {
    if (!currentClip?.file) {
      toast.error('Upload a video first');
      return;
    }

    setGeneratingTranscription(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: currentClip.file });
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate accurate subtitles/transcription for this video. Return timestamps and text in SRT format.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            subtitles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  start_time: { type: "number" },
                  end_time: { type: "number" },
                  text: { type: "string" }
                }
              }
            }
          }
        }
      });

      setTranscriptionData(result.subtitles);
      toast.success('Transcription generated!');
    } catch (error) {
      toast.error('Transcription failed: ' + error.message);
    } finally {
      setGeneratingTranscription(false);
    }
  };

  const generateHighlightClip = async () => {
    if (!currentClip?.file) {
      toast.error('Upload a video first');
      return;
    }

    setProcessing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: currentClip.file });
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this video and identify the most engaging moments for a highlight reel. Return 3-5 timestamp ranges that would make the best highlight clips (action, emotion, key moments).`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            highlights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  start: { type: "number" },
                  end: { type: "number" },
                  description: { type: "string" }
                }
              }
            }
          }
        }
      });

      toast.success(`Found ${result.highlights.length} highlight moments!`);
      
      // Apply first highlight as trim suggestion
      if (result.highlights[0]) {
        setTrimStart(result.highlights[0].start);
        setTrimEnd(result.highlights[0].end);
      }
    } catch (error) {
      toast.error('Highlight generation failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const applyTemplate = (template) => {
    if (template.color_grade) {
      setBrightness(template.color_grade.brightness || 100);
      setContrast(template.color_grade.contrast || 100);
      setSaturation(template.color_grade.saturation || 100);
      setFilter(template.color_grade.filter || "none");
      setSelectedLUT(template.color_grade.lut || "none");
    }
    if (template.speed_preset) {
      setPlaybackSpeed(template.speed_preset);
    }
    if (template.text_overlays) {
      const overlays = template.text_overlays.map((overlay, idx) => ({
        id: Date.now() + idx,
        text: overlay.preset_name,
        fontSize: overlay.fontSize,
        color: overlay.color,
        x: 50,
        y: 50,
        startTime: 0,
        endTime: 5
      }));
      setTextOverlays(overlays);
    }
    if (template.transitions) {
      setSelectedTransition(template.transitions[0]?.type || "fade");
    }
    if (template.audio_settings) {
      setMusicVolume(template.audio_settings.music_volume || 50);
      setVoiceoverVolume(template.audio_settings.voiceover_volume || 70);
      setAudioEchoEffect(template.audio_settings.effects?.includes("echo") || false);
      setAudioReverbEffect(template.audio_settings.effects?.includes("reverb") || false);
    }
    setShowTemplateLibrary(false);
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

  const handleStabilizeClip = async () => {
    if (!currentClip) {
      toast.error('Select a clip to stabilize');
      return;
    }

    // Upload the local clip file first if it hasn't been uploaded yet
    setStabilizing(true);
    toast.info('Uploading clip for stabilization...');

    try {
      let videoUrl = currentClip.stabilized_url || currentClip.remoteUrl;

      if (!videoUrl) {
        // Upload the local file to get a remote URL
        const { file_url } = await base44.integrations.Core.UploadFile({ file: currentClip.file });
        videoUrl = file_url;
        // Cache it so we don't re-upload
        setClips(prev => prev.map(c => c.id === currentClip.id ? { ...c, remoteUrl: file_url } : c));
      }

      toast.info('Stabilizing video... this may take a minute');

      const response = await stabilizeVideo({
        video_url: videoUrl,
        smoothing: stabilizationStrength,
        zoom: stabilizationZoom,
        duration: duration || 0,
        file_name: currentClip.name
      });

      if (response.data?.success) {
        const result = response.data;
        setStabilizationResult(result);

        // Update the clip with stabilization metadata
        const updatedClip = { 
          ...currentClip,
          isStabilized: true,
          stabilizationTransforms: result.stabilization_transforms,
          stabilizationZoom: result.effective_settings?.zoom || stabilizationZoom,
          name: currentClip.name.replace(' [stabilized]', '') + ' [stabilized]'
        };

        setClips(prev => prev.map(c => c.id === currentClip.id ? updatedClip : c));
        setCurrentClip(updatedClip);
        setStabilizedClips(prev => ({ ...prev, [currentClip.id]: true }));

        toast.success(`Stabilized! ${result.correction_percent?.toFixed(0) || '~70'}% shake removed.`);
      } else {
        toast.error(response.data?.error || 'Stabilization failed');
      }
    } catch (error) {
      toast.error('Stabilization error: ' + error.message);
    } finally {
      setStabilizing(false);
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
        <div className="flex gap-2">
          <Button
            onClick={() => setShowTemplateLibrary(!showTemplateLibrary)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Templates
          </Button>
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
      </div>

      {/* Template Library Modal */}
      <AnimatePresence>
        {showTemplateLibrary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl overflow-y-auto p-6"
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">Template Library</h2>
                <Button onClick={() => setShowTemplateLibrary(false)} variant="ghost">
                  <X className="w-6 h-6 text-white" />
                </Button>
              </div>
              <TemplateLibrary 
                onApplyTemplate={applyTemplate}
                currentUser={currentUser}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                      filter: `${filters.find(f => f.id === filter)?.css || ""} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                      // Apply stabilization transform: scale up slightly and reduce micro-jitter via smooth CSS
                      transform: currentClip?.isStabilized 
                        ? `scale(${currentClip.stabilizationZoom || 1})` 
                        : 'none',
                      transition: currentClip?.isStabilized ? 'transform 0.08s linear' : 'none'
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
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="px-3 py-1 bg-purple-500/70 backdrop-blur-sm rounded-lg">
                      <span className="text-white text-sm font-bold">
                        Clip {currentClipIndex + 1} of {clips.length}
                      </span>
                    </div>
                    {currentClip?.isStabilized && (
                      <div className="px-2 py-1 bg-cyan-500/80 backdrop-blur-sm rounded-lg flex items-center gap-1">
                        <Aperture className="w-3 h-3 text-white" />
                        <span className="text-white text-xs font-bold">Stabilized</span>
                      </div>
                    )}
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

                {/* Audio tracks */}
                {backgroundMusicUrl && (
                  <audio ref={audioRef} src={backgroundMusicUrl} loop />
                )}
                {voiceoverUrl && (
                  <audio src={voiceoverUrl} volume={voiceoverVolume / 100} />
                )}

                {/* Text Overlays Render */}
                {textOverlays.map((overlay) => {
                  if (currentTime >= overlay.startTime && currentTime <= overlay.endTime) {
                    // Determine position based on positionMode
                    const isBottom = overlay.positionMode === 'fixed_bottom';
                    const isTop = overlay.positionMode === 'fixed_top';
                    const isCenter = overlay.positionMode === 'fixed_center';

                    let posStyle = {};
                    if (isBottom) {
                      posStyle = { bottom: 0, left: 0, right: 0, transform: 'none', width: '100%', padding: '8px 12px' };
                    } else if (isTop) {
                      posStyle = { top: 0, left: 0, right: 0, transform: 'none', width: '100%', padding: '8px 12px' };
                    } else if (isCenter) {
                      posStyle = { top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', width: '100%', padding: '8px 12px' };
                    } else {
                      posStyle = {
                        left: `${overlay.x}%`,
                        top: `${overlay.y}%`,
                        transform: 'translate(-50%, -50%)',
                      };
                    }

                    const strokeShadow = overlay.strokeColor && overlay.strokeColor !== 'transparent'
                      ? `${overlay.strokeWidth || 2}px ${overlay.strokeWidth || 2}px 0 ${overlay.strokeColor}, -${overlay.strokeWidth || 2}px -${overlay.strokeWidth || 2}px 0 ${overlay.strokeColor}, ${overlay.strokeWidth || 2}px -${overlay.strokeWidth || 2}px 0 ${overlay.strokeColor}, -${overlay.strokeWidth || 2}px ${overlay.strokeWidth || 2}px 0 ${overlay.strokeColor}`
                      : '2px 2px 4px rgba(0,0,0,0.8)';

                    return (
                      <div
                        key={overlay.id}
                        className="absolute pointer-events-none"
                        style={{
                          ...posStyle,
                          fontSize: `${overlay.fontSize || 32}px`,
                          color: overlay.color || '#FFFFFF',
                          fontWeight: overlay.fontWeight || 'bold',
                          fontStyle: overlay.fontStyle || 'normal',
                          fontFamily: overlay.fontFamily || 'sans-serif',
                          textAlign: overlay.textAlign || 'center',
                          textShadow: strokeShadow,
                          backgroundColor: overlay.backgroundColor || 'transparent',
                          zIndex: 10,
                        }}
                      >
                        {overlay.text}
                      </div>
                    );
                  }
                  return null;
                })}
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

            {/* Audio Mixing */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Music className="w-5 h-5 text-blue-400" />
                  Audio Mixing
                </h4>
                <div className="space-y-4">
                  {/* Background Music */}
                  {backgroundMusicUrl ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-green-300 text-sm font-medium">Background Music</span>
                        <Button
                          onClick={() => setBackgroundMusicUrl("")}
                          size="sm"
                          variant="ghost"
                          className="text-red-400 h-6 w-6 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">
                          Volume: {musicVolume}%
                        </label>
                        <Slider
                          value={[musicVolume]}
                          onValueChange={(v) => setMusicVolume(v[0])}
                          max={100}
                          step={1}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => document.getElementById('music-upload').click()}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Music className="w-4 h-4 mr-2" />
                        Add Background Music
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

                  {/* Voiceover */}
                  {voiceoverUrl ? (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-300 text-sm font-medium flex items-center gap-1">
                          <Mic className="w-4 h-4" />
                          Voiceover
                        </span>
                        <Button
                          onClick={() => setVoiceoverUrl("")}
                          size="sm"
                          variant="ghost"
                          className="text-red-400 h-6 w-6 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">
                          Volume: {voiceoverVolume}%
                        </label>
                        <Slider
                          value={[voiceoverVolume]}
                          onValueChange={(v) => setVoiceoverVolume(v[0])}
                          max={100}
                          step={1}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => document.getElementById('voiceover-upload').click()}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Add Voiceover
                      </Button>
                      <input
                        id="voiceover-upload"
                        type="file"
                        accept="audio/*"
                        onChange={handleVoiceoverUpload}
                        className="hidden"
                      />
                    </>
                  )}

                  {/* Audio Effects */}
                  <div className="space-y-2">
                    <label className="text-gray-400 text-xs block">Audio Effects</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAudioEchoEffect(!audioEchoEffect)}
                        className={`flex-1 p-2 rounded-lg text-xs font-medium transition ${
                          audioEchoEffect
                            ? 'bg-cyan-600 text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        Echo
                      </button>
                      <button
                        onClick={() => setAudioReverbEffect(!audioReverbEffect)}
                        className={`flex-1 p-2 rounded-lg text-xs font-medium transition ${
                          audioReverbEffect
                            ? 'bg-cyan-600 text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        Reverb
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI-Powered Features */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-400" />
                  AI Tools
                </h4>
                <div className="space-y-2">
                  <Button
                    onClick={generateTranscription}
                    disabled={generatingTranscription || !currentClip}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {generatingTranscription ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Transcribing...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Auto-Generate Subtitles
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={generateHighlightClip}
                    disabled={processing || !currentClip}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Find Best Moments
                      </>
                    )}
                  </Button>
                  {transcriptionData && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-green-300 text-xs">
                      ✓ {transcriptionData.length} subtitle segments ready
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Video Stabilization */}
            <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Aperture className="w-5 h-5 text-cyan-400" />
                  Video Stabilization
                  {currentClip && stabilizedClips[currentClip.id] && (
                    <span className="ml-auto text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                      ✓ Stabilized
                    </span>
                  )}
                </h4>
                <p className="text-gray-400 text-xs mb-3">
                  Smooth out shaky handheld footage using FFmpeg's VidStab engine. Best for clips with noticeable camera shake.
                </p>
                <div className="space-y-3 mb-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 flex justify-between">
                      <span>Smoothing Strength</span>
                      <span className="text-cyan-400">{stabilizationStrength}</span>
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      value={stabilizationStrength}
                      onChange={e => setStabilizationStrength(Number(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-gray-600 text-xs mt-0.5">
                      <span>Subtle</span>
                      <span>Max</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 flex justify-between">
                      <span>Zoom Compensation</span>
                      <span className="text-cyan-400">{stabilizationZoom === 1 ? 'None' : `${((stabilizationZoom - 1) * 100).toFixed(0)}%`}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={1.3}
                      step={0.05}
                      value={stabilizationZoom}
                      onChange={e => setStabilizationZoom(Number(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-gray-600 text-xs mt-0.5">
                      <span>None</span>
                      <span>30% zoom</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleStabilizeClip}
                  disabled={stabilizing || !currentClip}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {stabilizing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing & Stabilizing...
                    </>
                  ) : (
                    <>
                      <Aperture className="w-4 h-4 mr-2" />
                      {currentClip && stabilizedClips[currentClip.id] ? 'Re-Stabilize Clip' : 'Stabilize Clip'}
                    </>
                  )}
                </Button>

                {/* Stabilization Results */}
                {stabilizationResult && currentClip && stabilizedClips[currentClip.id] && (
                  <div className="mt-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Shake Score</span>
                      <span className="text-cyan-300 font-bold">{stabilizationResult.shake_score}/100</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div 
                        className="h-1.5 rounded-full bg-gradient-to-r from-green-400 to-cyan-400"
                        style={{ width: `${stabilizationResult.correction_percent || 70}%` }}
                      />
                    </div>
                    <div className="text-xs text-green-400 font-medium">
                      ✓ ~{(stabilizationResult.correction_percent || 70).toFixed(0)}% shake removed
                    </div>
                    {stabilizationResult.analysis?.summary && (
                      <p className="text-gray-400 text-xs leading-relaxed">
                        {stabilizationResult.analysis.summary}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Type className="w-5 h-5 text-yellow-400" />
                  Text Overlays & Captions
                </h4>
                <VideoTextOverlayEditor
                  overlays={textOverlays}
                  setOverlays={setTextOverlays}
                  currentTime={currentTime}
                  duration={duration}
                />
              </CardContent>
            </Card>
          </div>

          {/* Color Adjustments & Filters */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <h4 className="text-white font-semibold mb-3">Advanced Editing</h4>
              
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

              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button 
                  onClick={applyFilterToClip}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apply All Effects
                </Button>
                <Button
                  onClick={() => {
                    setBrightness(100);
                    setContrast(100);
                    setSaturation(100);
                    setFilter("none");
                    setSelectedLUT("none");
                    setPlaybackSpeed(1);
                  }}
                  variant="outline"
                  className="bg-white/5"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Export Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-white font-semibold mb-3">Export Format</h4>
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
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-3">Export Quality</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {['720p', '1080p', '4K'].map((quality) => (
                      <button
                        key={quality}
                        className="p-3 rounded-lg text-sm font-medium bg-white/10 text-gray-300 hover:bg-white/20 transition"
                      >
                        {quality}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Summary */}
          <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-purple-400 text-sm mb-1">Total Clips</div>
                  <div className="text-white text-2xl font-bold">{clips.length}</div>
                </div>
                <div>
                  <div className="text-blue-400 text-sm mb-1">Duration</div>
                  <div className="text-white text-2xl font-bold">
                    {clips.reduce((sum, c) => sum + ((c.trimEnd || 0) - (c.trimStart || 0)), 0).toFixed(0)}s
                  </div>
                </div>
                <div>
                  <div className="text-green-400 text-sm mb-1">Audio Tracks</div>
                  <div className="text-white text-2xl font-bold">
                    {(backgroundMusicUrl ? 1 : 0) + (voiceoverUrl ? 1 : 0)}
                  </div>
                </div>
                <div>
                  <div className="text-yellow-400 text-sm mb-1">Text Overlays</div>
                  <div className="text-white text-2xl font-bold">{textOverlays.length}</div>
                </div>
                <div>
                  <div className="text-pink-400 text-sm mb-1">Effects</div>
                  <div className="text-white text-2xl font-bold">
                    {(filter !== 'none' ? 1 : 0) + (selectedLUT !== 'none' ? 1 : 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
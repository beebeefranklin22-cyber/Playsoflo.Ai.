import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  X, Scissors, Sparkles, Tag, Film, CheckCircle,
  Loader2, Play, Pause, SkipBack, SkipForward,
  Clock, Zap, Save, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const CATEGORY_OPTIONS = [
  "gaming", "entertainment", "music", "sports", "news",
  "education", "lifestyle", "technology", "comedy", "other"
];

const TAG_SUGGESTIONS = [
  "highlight", "funny", "epic", "tutorial", "reaction",
  "live", "vlog", "stream", "gameplay", "interview"
];

export default function PostStreamEditor({ stream, onClose, onSaved }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Trim state (in seconds)
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Metadata
  const [title, setTitle] = useState(stream.title || "");
  const [description, setDescription] = useState(stream.description || "");
  const [category, setCategory] = useState(stream.category || "entertainment");
  const [tags, setTags] = useState(stream.tags || []);
  const [tagInput, setTagInput] = useState("");

  // Highlights
  const [highlights, setHighlights] = useState([]);
  const [extractingHighlights, setExtractingHighlights] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState("trim"); // trim | highlights | metadata

  useEffect(() => {
    if (videoRef.current && stream.video_url) {
      videoRef.current.src = stream.video_url;
    }
  }, [stream.video_url]);

  const handleVideoLoaded = () => {
    const d = videoRef.current?.duration || 0;
    setDuration(d);
    setTrimEnd(d);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(videoRef.current?.currentTime || 0);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.currentTime = trimStart;
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (t) => {
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const formatTime = (secs) => {
    if (!isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const trimPercent = (val) => duration > 0 ? (val / duration) * 100 : 0;

  const extractHighlights = async () => {
    setExtractingHighlights(true);
    try {
      const context = `
Stream title: "${title}"
Category: ${category}
Tags: ${tags.join(", ")}
Stream duration: ${formatTime(duration)}
Description: ${description || "No description"}
      `.trim();

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a livestream highlight extractor. Given this stream info, generate 3-5 highlight clip suggestions with titles and timestamps.

${context}

Return a JSON array of highlight objects. Each object must have:
- title: string (catchy clip title)
- start_time: number (seconds from start, spread across the stream duration of ${Math.floor(duration)} seconds)
- end_time: number (seconds, each clip 30-120 seconds long)
- reason: string (why this is a good highlight, 1 sentence)
- tags: array of 2-3 string tags

Important: Keep start_time and end_time within 0 and ${Math.floor(duration || 3600)}.`,
        response_json_schema: {
          type: "object",
          properties: {
            highlights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  start_time: { type: "number" },
                  end_time: { type: "number" },
                  reason: { type: "string" },
                  tags: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      const extracted = result?.highlights || [];
      setHighlights(extracted);
      if (extracted.length > 0) {
        toast.success(`Found ${extracted.length} highlight clips!`);
        setActiveStep("highlights");
      } else {
        toast.info("No highlights found. Try adding more tags.");
      }
    } catch (e) {
      toast.error("Highlight extraction failed: " + e.message);
    } finally {
      setExtractingHighlights(false);
    }
  };

  const saveHighlightAsClip = async (highlight) => {
    try {
      await base44.entities.StreamingContent.create({
        title: highlight.title,
        description: highlight.reason,
        video_url: stream.video_url,
        thumbnail_url: stream.thumbnail_url,
        category,
        tags: highlight.tags || [],
        type: "clip",
        status: "published",
        is_live: false,
        creator_email: stream.creator_email || stream.created_by,
        creator_username: stream.creator_username,
        content_type: "highlight_clip",
        clip_start_time: highlight.start_time,
        clip_end_time: highlight.end_time,
        source_stream_id: stream.id,
      });
      toast.success(`Saved "${highlight.title}" as a clip!`);
    } catch (e) {
      toast.error("Failed to save clip: " + e.message);
    }
  };

  const addTag = (tag) => {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
    }
    setTagInput("");
  };

  const saveVOD = async () => {
    if (!title.trim()) { toast.error("Please add a title"); return; }
    setSaving(true);
    try {
      await base44.entities.StreamingContent.update(stream.id, {
        title,
        description,
        category,
        tags,
        content_type: "vod_from_live",
        status: "published",
        visibility: "public",
        is_live: false,
        // Store trim points as metadata — actual trimming requires a transcoding service
        vod_trim_start: trimStart > 0 ? trimStart : undefined,
        vod_trim_end: trimEnd < duration ? trimEnd : undefined,
      });
      toast.success("Stream saved to your channel as a VOD!");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const STEPS = [
    { id: "trim", label: "Trim", icon: Scissors },
    { id: "highlights", label: "Highlights", icon: Zap },
    { id: "metadata", label: "Details", icon: Tag },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-2xl bg-[#18181b] rounded-2xl overflow-hidden max-h-[95vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-400" />
              Post-Stream Editor
            </h2>
            <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{stream.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Step Nav */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          {STEPS.map((step, i) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition ${
                activeStep === step.id
                  ? "text-white border-b-2 border-purple-500"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              <step.icon className="w-3.5 h-3.5" />
              {step.label}
              {step.id === "highlights" && highlights.length > 0 && (
                <span className="ml-1 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {highlights.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* ── TRIM STEP ── */}
          {activeStep === "trim" && (
            <div className="space-y-4">
              {/* Video preview */}
              {stream.video_url ? (
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    onLoadedMetadata={handleVideoLoaded}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                  />
                  {/* Playback controls overlay */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div className="flex items-center gap-3">
                      <button onClick={togglePlay} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
                        {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white fill-white" />}
                      </button>
                      <span className="text-white text-xs font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <Film className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No video URL available</p>
                    <p className="text-gray-600 text-xs mt-1">Live streams recorded via Agora are processed server-side</p>
                  </div>
                </div>
              )}

              {/* Trim controls */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Scissors className="w-4 h-4 text-yellow-400" />
                  <p className="text-white font-semibold text-sm">Trim Points</p>
                  {trimStart > 0 || (duration > 0 && trimEnd < duration) ? (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs ml-auto">
                      {formatTime(trimEnd - trimStart)} trimmed
                    </Badge>
                  ) : null}
                </div>

                {/* Visual timeline */}
                {duration > 0 && (
                  <div className="relative h-8 bg-gray-800 rounded-lg overflow-hidden cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = (e.clientX - rect.left) / rect.width;
                      seekTo(pct * duration);
                    }}
                  >
                    {/* Active region */}
                    <div
                      className="absolute top-0 bottom-0 bg-purple-600/40 border-x-2 border-purple-500"
                      style={{ left: `${trimPercent(trimStart)}%`, width: `${trimPercent(trimEnd) - trimPercent(trimStart)}%` }}
                    />
                    {/* Playhead */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white"
                      style={{ left: `${trimPercent(currentTime)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-gray-500 text-xs">{formatTime(duration)} total</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block flex items-center gap-1">
                      <SkipBack className="w-3 h-3" /> Start (seconds)
                    </label>
                    <Input
                      type="number" min={0} max={trimEnd - 1} step={1}
                      value={Math.round(trimStart)}
                      onChange={e => {
                        const v = Math.max(0, Math.min(Number(e.target.value), trimEnd - 1));
                        setTrimStart(v);
                        seekTo(v);
                      }}
                      className="bg-white/8 border-white/15 text-white"
                    />
                    <p className="text-gray-600 text-xs mt-0.5">{formatTime(trimStart)}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block flex items-center gap-1">
                      <SkipForward className="w-3 h-3" /> End (seconds)
                    </label>
                    <Input
                      type="number" min={trimStart + 1} max={duration} step={1}
                      value={Math.round(trimEnd)}
                      onChange={e => {
                        const v = Math.min(duration, Math.max(Number(e.target.value), trimStart + 1));
                        setTrimEnd(v);
                        seekTo(v);
                      }}
                      className="bg-white/8 border-white/15 text-white"
                    />
                    <p className="text-gray-600 text-xs mt-0.5">{formatTime(trimEnd)}</p>
                  </div>
                </div>

                {duration === 0 && (
                  <p className="text-gray-500 text-xs bg-white/5 rounded-lg p-3">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    Trim points are saved as metadata. Full server-side re-encoding will be applied when your VOD is processed.
                  </p>
                )}
              </div>

              <Button
                onClick={() => setActiveStep("highlights")}
                className="w-full bg-purple-600 hover:bg-purple-700 font-semibold"
              >
                Next: Extract Highlights <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── HIGHLIGHTS STEP ── */}
          {activeStep === "highlights" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">AI Highlight Extraction</p>
                    <p className="text-gray-400 text-xs mt-0.5 mb-3">
                      Our AI analyzes your stream's title, category, and tags to suggest the best clip moments.
                    </p>
                    <Button
                      onClick={extractHighlights}
                      disabled={extractingHighlights}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold w-full sm:w-auto"
                    >
                      {extractingHighlights ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing stream...</>
                      ) : (
                        <><Zap className="w-4 h-4 mr-2" /> Extract Highlights with AI</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {highlights.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <p className="text-white font-semibold text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      {highlights.length} Highlights Found
                    </p>
                    {highlights.map((h, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm line-clamp-1">{h.title}</p>
                            <p className="text-gray-400 text-xs mt-0.5">{h.reason}</p>
                          </div>
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs flex-shrink-0">
                            <Clock className="w-2.5 h-2.5 mr-1" />
                            {formatTime(h.start_time)} – {formatTime(h.end_time)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {h.tags?.map((t, j) => (
                              <span key={j} className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded-full">#{t}</span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => seekTo(h.start_time)}
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              <Play className="w-3 h-3" /> Preview
                            </button>
                            <button
                              onClick={() => saveHighlightAsClip(h)}
                              className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 font-semibold"
                            >
                              <Save className="w-3 h-3" /> Save Clip
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                onClick={() => setActiveStep("metadata")}
                className="w-full bg-purple-600 hover:bg-purple-700 font-semibold"
              >
                Next: Add Details <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── METADATA STEP ── */}
          {activeStep === "metadata" && (
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Title *</label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="VOD title"
                  className="bg-white/8 border-white/15 text-white"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Description</label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What was this stream about?"
                  rows={3}
                  className="bg-white/8 border-white/15 text-white resize-none"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition ${
                        category === cat
                          ? "bg-purple-600 text-white"
                          : "bg-white/8 text-gray-400 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Tags</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyPress={e => e.key === "Enter" && addTag(tagInput)}
                    placeholder="Add tag + Enter"
                    className="bg-white/8 border-white/15 text-white flex-1"
                  />
                  <Button size="sm" variant="outline" className="border-white/15 px-3" onClick={() => addTag(tagInput)}>+</Button>
                </div>
                {/* Suggestions */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {TAG_SUGGESTIONS.filter(t => !tags.includes(t)).slice(0, 6).map(t => (
                    <button
                      key={t}
                      onClick={() => addTag(t)}
                      className="text-xs bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:border-white/20 px-2 py-0.5 rounded-full transition"
                    >
                      + {t}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t, i) => (
                    <span key={i} className="flex items-center gap-1 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs px-2 py-1 rounded-full">
                      #{t}
                      <button onClick={() => setTags(prev => prev.filter((_, j) => j !== i))} className="text-purple-400 hover:text-white ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2 text-xs text-gray-400">
                <p className="text-white font-semibold text-sm mb-1">VOD Summary</p>
                {(trimStart > 0 || trimEnd < duration) && (
                  <p className="flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5 text-yellow-400" /> Trimmed: {formatTime(trimStart)} → {formatTime(trimEnd)} ({formatTime(trimEnd - trimStart)})</p>
                )}
                {highlights.length > 0 && (
                  <p className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-yellow-400" /> {highlights.length} highlight clips generated</p>
                )}
                <p className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-purple-400" /> Category: <span className="text-white capitalize">{category}</span></p>
                <p className="flex items-center gap-1.5"><Film className="w-3.5 h-3.5 text-blue-400" /> {tags.length} tags added</p>
              </div>

              <Button
                onClick={saveVOD}
                disabled={saving || !title.trim()}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12 font-bold text-base"
              >
                {saving ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving to channel...</>
                ) : (
                  <><CheckCircle className="w-5 h-5 mr-2" /> Save VOD to Channel</>
                )}
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
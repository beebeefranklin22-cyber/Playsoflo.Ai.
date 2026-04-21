import React, { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Film, Tv, Upload, DollarSign, Star, Loader2, CheckCircle, Link, CloudUpload, Play } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const GENRES = ["Action","Comedy","Drama","Horror","Sci-Fi","Romance","Documentary","Thriller","Animation","Crime","Fantasy","Biography","Sports","Music","Lifestyle","Gaming","News","Kids"];

const CONTENT_TYPES = [
  { value: "movie", label: "Movie", icon: Film, color: "bg-orange-600" },
  { value: "series", label: "TV Series", icon: Tv, color: "bg-purple-600" },
  { value: "podcast", label: "Podcast", icon: Play, color: "bg-blue-600" },
  { value: "music_concert", label: "Concert", icon: Play, color: "bg-pink-600" },
];

const DEFAULT_DATA = {
  title: "", type: "movie", category: "entertainment",
  description: "", thumbnail_url: "", video_url: "",
  duration: "", rating: "", genre: "", cast: "", director: "", year: "",
  season: "", episodes: "",
  is_monetized: false, price_usd: "", rental_price_usd: "",
  requires_subscription: false,
};

export default function ContentUploadModal({ currentUser, onClose }) {
  const [data, setData] = useState(DEFAULT_DATA);
  const [videoMode, setVideoMode] = useState("url"); // "url" | "file"
  const [videoFile, setVideoFile] = useState(null);
  const [videoLocalUrl, setVideoLocalUrl] = useState(null);
  const [videoUploadState, setVideoUploadState] = useState("idle"); // idle | uploading | done | error
  const [thumbUploading, setThumbUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const uploadedVideoUrlRef = useRef(null);
  const videoInputRef = useRef(null);

  const set = (field, value) => setData(p => ({ ...p, [field]: value }));
  const inputCls = "bg-white/8 border-white/15 text-white placeholder-gray-500";
  const inputStyle = { background: "rgba(255,255,255,0.06)" };

  // Background video upload — non-blocking
  const startBackgroundUpload = useCallback(async (file) => {
    setVideoUploadState("uploading");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedVideoUrlRef.current = file_url;
      setVideoUploadState("done");
      toast.success("Video upload complete!");
    } catch {
      setVideoUploadState("error");
      toast.error("Video upload failed — you can try again or use a URL instead.");
    }
  }, []);

  const handleVideoFileSelect = (file) => {
    if (!file) return;
    const maxGB = 10;
    if (file.size > maxGB * 1024 * 1024 * 1024) {
      toast.error(`File too large. Max ${maxGB}GB.`); return;
    }
    setVideoFile(file);
    setVideoLocalUrl(URL.createObjectURL(file));
    uploadedVideoUrlRef.current = null;
    // Start upload immediately in background
    startBackgroundUpload(file);
    toast.info("Upload started in background — fill out details while it uploads!");
  };

  const handleThumbnailUpload = async (file) => {
    if (!file) return;
    setThumbUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("thumbnail_url", file_url);
    } catch {
      toast.error("Thumbnail upload failed");
    } finally {
      setThumbUploading(false);
    }
  };

  const getVideoUrl = () => {
    if (videoMode === "url") return data.video_url;
    return uploadedVideoUrlRef.current || null;
  };

  const handlePublish = async () => {
    if (!data.title) { toast.error("Title is required"); return; }

    const videoUrl = getVideoUrl();

    // If file mode and still uploading, publish with local metadata and update once done
    if (videoMode === "file" && videoUploadState === "uploading") {
      toast.info("Video still uploading — publishing metadata now, video will be available shortly.");
    } else if (videoMode === "file" && videoUploadState === "idle" && !videoFile) {
      toast.error("Please select a video file or enter a URL"); return;
    } else if (videoMode === "url" && !data.video_url) {
      toast.error("Please enter a video URL"); return;
    }

    setPublishing(true);
    try {
      const tags = [data.genre, data.type, data.category].filter(Boolean);
      if (data.cast) tags.push(...data.cast.split(",").map(s => s.trim()).filter(Boolean));

      const record = await base44.entities.StreamingContent.create({
        title: data.title,
        type: data.type,
        category: data.category,
        description: data.description,
        thumbnail_url: data.thumbnail_url,
        video_url: videoUrl || "",
        duration: data.duration,
        rating: parseFloat(data.rating) || 0,
        tags,
        is_live: false,
        status: "published",
        is_monetized: data.is_monetized,
        price_usd: parseFloat(data.price_usd) || 0,
        rental_price_usd: parseFloat(data.rental_price_usd) || 0,
        requires_subscription: data.requires_subscription,
        creator_email: currentUser.email,
        creator_username: currentUser.username || currentUser.full_name,
      });

      toast.success(`${data.type === "series" ? "TV Show" : "Content"} published!`);

      // If still uploading, patch when done
      if (videoMode === "file" && videoUploadState === "uploading" && record?.id) {
        const waitForUpload = async () => {
          let attempts = 0;
          while (!uploadedVideoUrlRef.current && attempts < 120) {
            await new Promise(r => setTimeout(r, 3000));
            attempts++;
          }
          if (uploadedVideoUrlRef.current) {
            try {
              await base44.entities.StreamingContent.update(record.id, { video_url: uploadedVideoUrlRef.current });
              toast.success("Video is now fully available for viewers!");
            } catch {}
          }
        };
        waitForUpload(); // fire & forget
      }

      onClose();
    } catch (e) {
      toast.error("Publish failed: " + e.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-[#18181b] rounded-t-3xl sm:rounded-3xl max-h-[95vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#18181b] px-5 pt-5 pb-3 border-b border-white/10 z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-orange-400" />
              Upload Content
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          {/* Content type */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {CONTENT_TYPES.map(ct => (
              <button
                key={ct.value}
                onClick={() => set("type", ct.value)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${data.type === ct.value ? ct.color + " text-white" : "bg-white/8 text-gray-400 hover:text-white"}`}
              >
                <ct.icon className="w-3.5 h-3.5" />{ct.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* VIDEO — primary section, first */}
          <div>
            <label className="text-gray-400 text-xs mb-2 block font-semibold uppercase tracking-wide">Video *</label>
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-3">
              <button
                onClick={() => setVideoMode("url")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${videoMode === "url" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                <Link className="w-3.5 h-3.5" /> Paste URL
              </button>
              <button
                onClick={() => setVideoMode("file")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${videoMode === "file" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                <CloudUpload className="w-3.5 h-3.5" /> Upload File
              </button>
            </div>

            {videoMode === "url" ? (
              <div>
                <Input
                  value={data.video_url}
                  onChange={e => set("video_url", e.target.value)}
                  placeholder="https://example.com/video.mp4 or streaming URL"
                  className={inputCls}
                  style={inputStyle}
                />
                {data.video_url && <p className="text-green-400 text-xs mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> URL set</p>}
                <p className="text-gray-600 text-xs mt-1">Supports MP4, HLS, YouTube, Vimeo, or any direct video URL</p>
              </div>
            ) : (
              <div>
                <input ref={videoInputRef} type="file" accept="video/*,video/mp4,video/mov,video/avi,video/mkv,video/webm" className="hidden"
                  onChange={e => handleVideoFileSelect(e.target.files?.[0])} />

                {!videoFile ? (
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-purple-500/50 hover:bg-white/3 transition"
                  >
                    <CloudUpload className="w-8 h-8 text-gray-500" />
                    <p className="text-white font-semibold text-sm">Choose video file</p>
                    <p className="text-gray-500 text-xs">MP4, MOV, AVI, MKV, WebM — up to 10GB</p>
                  </button>
                ) : (
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    {/* File info */}
                    <div className="p-3 bg-white/5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-600/30 flex items-center justify-center flex-shrink-0">
                        <Film className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{videoFile.name}</p>
                        <p className="text-gray-500 text-xs">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button onClick={() => { setVideoFile(null); setVideoLocalUrl(null); setVideoUploadState("idle"); uploadedVideoUrlRef.current = null; }}
                        className="p-1 hover:bg-white/10 rounded-full flex-shrink-0">
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                    {/* Upload status bar */}
                    <div className={`px-3 py-2 flex items-center gap-2 text-xs ${
                      videoUploadState === "done" ? "bg-green-500/10" :
                      videoUploadState === "error" ? "bg-red-500/10" : "bg-blue-500/10"
                    }`}>
                      {videoUploadState === "uploading" && (
                        <><Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
                        <span className="text-blue-300">Uploading in background — fill out details below while it uploads</span></>
                      )}
                      {videoUploadState === "done" && (
                        <><CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        <span className="text-green-300">Upload complete — ready to publish</span></>
                      )}
                      {videoUploadState === "error" && (
                        <><X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <span className="text-red-300">Upload failed</span>
                        <button onClick={() => startBackgroundUpload(videoFile)} className="ml-auto text-red-400 underline">Retry</button></>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Title *</label>
            <Input value={data.title} onChange={e => set("title", e.target.value)} placeholder="Enter title" className={inputCls} style={inputStyle} />
          </div>

          {/* Genre + Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Genre</label>
              <Select value={data.genre} onValueChange={v => set("genre", v)}>
                <SelectTrigger className={inputCls} style={inputStyle}><SelectValue placeholder="Select genre" /></SelectTrigger>
                <SelectContent>
                  {GENRES.map(g => <SelectItem key={g} value={g.toLowerCase()}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Year</label>
              <Input value={data.year} onChange={e => set("year", e.target.value)} placeholder="2024" className={inputCls} style={inputStyle} />
            </div>
          </div>

          {/* Series fields */}
          {(data.type === "series") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Season #</label>
                <Input value={data.season} onChange={e => set("season", e.target.value)} placeholder="1" type="number" min="1" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Episodes</label>
                <Input value={data.episodes} onChange={e => set("episodes", e.target.value)} placeholder="10" type="number" min="1" className={inputCls} style={inputStyle} />
              </div>
            </div>
          )}

          {/* Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Duration</label>
              <Input value={data.duration} onChange={e => set("duration", e.target.value)} placeholder="e.g. 2h 15m" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />Rating</label>
              <Input value={data.rating} onChange={e => set("rating", e.target.value)} placeholder="8.5" type="number" min="0" max="10" step="0.1" className={inputCls} style={inputStyle} />
            </div>
          </div>

          {/* Director + Cast */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Director</label>
              <Input value={data.director} onChange={e => set("director", e.target.value)} placeholder="Director" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Cast</label>
              <Input value={data.cast} onChange={e => set("cast", e.target.value)} placeholder="Actor 1, Actor 2" className={inputCls} style={inputStyle} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Synopsis</label>
            <Textarea value={data.description} onChange={e => set("description", e.target.value)} placeholder="Tell viewers what this is about..." className={inputCls} rows={2} style={inputStyle} />
          </div>

          {/* Thumbnail */}
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Poster / Thumbnail</label>
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" id="content-thumb" className="hidden" onChange={e => handleThumbnailUpload(e.target.files?.[0])} />
              <Button type="button" onClick={() => document.getElementById("content-thumb").click()} variant="outline" size="sm" className="bg-white/5 border-white/15" disabled={thumbUploading}>
                {thumbUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                {thumbUploading ? "Uploading..." : "Choose Poster"}
              </Button>
              {data.thumbnail_url && <img src={data.thumbnail_url} className="h-10 w-8 object-cover rounded" alt="thumb" />}
              {!data.thumbnail_url && <p className="text-gray-600 text-xs">Optional but recommended</p>}
            </div>
          </div>

          {/* Monetization */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />Monetization
            </p>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={data.is_monetized} onChange={e => set("is_monetized", e.target.checked)} className="w-4 h-4 accent-green-500" />
              <span className="text-white text-sm">Enable paid access</span>
            </label>
            <AnimatePresence>
              {data.is_monetized && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="space-y-3 pl-6 pb-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Buy Price ($)</label>
                        <Input type="number" min="0" step="0.01" value={data.price_usd} onChange={e => set("price_usd", e.target.value)} placeholder="9.99" className={inputCls} style={inputStyle} />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Rent Price ($)</label>
                        <Input type="number" min="0" step="0.01" value={data.rental_price_usd} onChange={e => set("rental_price_usd", e.target.value)} placeholder="3.99" className={inputCls} style={inputStyle} />
                      </div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 text-green-300 text-xs">
                      You earn <strong>85%</strong> per sale.
                      {data.price_usd && <> Buy: ${(parseFloat(data.price_usd) * 0.85).toFixed(2)}</>}
                      {data.rental_price_usd && <> · Rent: ${(parseFloat(data.rental_price_usd) * 0.85).toFixed(2)}</>}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={data.requires_subscription} onChange={e => set("requires_subscription", e.target.checked)} className="w-4 h-4 accent-purple-500" />
              <span className="text-white text-sm">Subscription-only</span>
            </label>
          </div>

          {/* Publish Button */}
          <Button
            onClick={handlePublish}
            disabled={publishing || (!data.title) || (videoMode === "url" && !data.video_url) || (videoMode === "file" && !videoFile)}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 h-11 font-bold"
          >
            {publishing
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Publishing...</>
              : videoMode === "file" && videoUploadState === "uploading"
              ? <><Upload className="w-4 h-4 mr-2" />Publish Now (video finishing in background)</>
              : <><Film className="w-4 h-4 mr-2" />Publish</>
            }
          </Button>

          <p className="text-gray-700 text-xs text-center pb-2">Content appears in the feed immediately after publishing.</p>
        </div>
      </motion.div>
    </div>
  );
}
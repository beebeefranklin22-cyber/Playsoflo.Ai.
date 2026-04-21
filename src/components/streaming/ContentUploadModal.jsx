import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Film, Tv, Upload, DollarSign, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const GENRES = ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Documentary", "Thriller", "Animation", "Crime", "Fantasy", "Biography"];

const DEFAULT_DATA = {
  title: "", type: "movie", category: "entertainment",
  description: "", thumbnail_url: "", video_url: "",
  duration: "", rating: "", tags: [],
  genre: "", cast: "", director: "", year: "",
  season: "", episodes: "",
  is_monetized: false, price_usd: "", rental_price_usd: "",
  requires_subscription: false,
};

export default function ContentUploadModal({ currentUser, onClose }) {
  const [data, setData] = useState(DEFAULT_DATA);
  const [uploading, setUploading] = useState(false);
  const [thumbUploading, setThumbUploading] = useState(false);

  const set = (field, value) => setData(p => ({ ...p, [field]: value }));

  const handleThumbnailUpload = async (file) => {
    if (!file) return;
    setThumbUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("thumbnail_url", file_url);
      toast.success("Thumbnail uploaded!");
    } catch {
      toast.error("Thumbnail upload failed");
    } finally {
      setThumbUploading(false);
    }
  };

  const handleVideoUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("video_url", file_url);
      toast.success("Video uploaded!");
    } catch {
      toast.error("Video upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!data.title) { toast.error("Title is required"); return; }
    if (!data.video_url) { toast.error("Video URL or file is required"); return; }
    setUploading(true);
    try {
      const tags = [data.genre, data.type].filter(Boolean);
      if (data.cast) tags.push(...data.cast.split(",").map(s => s.trim()).filter(Boolean));

      await base44.entities.StreamingContent.create({
        title: data.title,
        type: data.type,
        category: data.category,
        description: data.description,
        thumbnail_url: data.thumbnail_url,
        video_url: data.video_url,
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
        // Store extra metadata in description if needed
        ...(data.director ? {} : {}),
      });
      toast.success(`${data.type === "series" ? "TV Show" : "Movie"} published! Viewers can now discover it.`);
      onClose();
    } catch (e) {
      toast.error("Publish failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const inputCls = "bg-white/8 border-white/15 text-white placeholder-gray-500";
  const style = { background: "rgba(255,255,255,0.06)" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-[#18181b] rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#18181b] px-6 pt-6 pb-4 border-b border-white/10 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-orange-400" />
              Upload TV Show / Movie
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          {/* Content type toggle */}
          <div className="flex gap-2 mt-4 p-1 bg-white/5 rounded-xl">
            <button
              onClick={() => set("type", "movie")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${data.type === "movie" ? "bg-orange-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              <Film className="w-4 h-4" /> Movie
            </button>
            <button
              onClick={() => set("type", "series")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${data.type === "series" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              <Tv className="w-4 h-4" /> TV Series
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Title *</label>
            <Input value={data.title} onChange={e => set("title", e.target.value)} placeholder="Enter title" className={inputCls} style={style} />
          </div>

          {/* Genre + Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Genre</label>
              <Select value={data.genre} onValueChange={v => set("genre", v)}>
                <SelectTrigger className={inputCls} style={style}><SelectValue placeholder="Select genre" /></SelectTrigger>
                <SelectContent>
                  {GENRES.map(g => <SelectItem key={g} value={g.toLowerCase()}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Release Year</label>
              <Input value={data.year} onChange={e => set("year", e.target.value)} placeholder="e.g. 2024" className={inputCls} style={style} />
            </div>
          </div>

          {/* Director + Cast */}
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Director</label>
            <Input value={data.director} onChange={e => set("director", e.target.value)} placeholder="Director name" className={inputCls} style={style} />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Cast (comma-separated)</label>
            <Input value={data.cast} onChange={e => set("cast", e.target.value)} placeholder="Actor 1, Actor 2, Actor 3" className={inputCls} style={style} />
          </div>

          {/* Series-specific */}
          {data.type === "series" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Season #</label>
                <Input value={data.season} onChange={e => set("season", e.target.value)} placeholder="1" type="number" min="1" className={inputCls} style={style} />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Episodes</label>
                <Input value={data.episodes} onChange={e => set("episodes", e.target.value)} placeholder="10" type="number" min="1" className={inputCls} style={style} />
              </div>
            </div>
          )}

          {/* Duration + Rating */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Duration</label>
              <Input value={data.duration} onChange={e => set("duration", e.target.value)} placeholder="e.g. 1h 45m" className={inputCls} style={style} />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />Rating (0-10)</label>
              <Input value={data.rating} onChange={e => set("rating", e.target.value)} placeholder="8.5" type="number" min="0" max="10" step="0.1" className={inputCls} style={style} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Description / Synopsis</label>
            <Textarea value={data.description} onChange={e => set("description", e.target.value)} placeholder="Tell viewers what this is about..." className={inputCls} rows={3} style={style} />
          </div>

          {/* Thumbnail */}
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Poster / Thumbnail</label>
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" id="content-thumb" className="hidden" onChange={e => handleThumbnailUpload(e.target.files?.[0])} />
              <Button type="button" onClick={() => document.getElementById("content-thumb").click()} variant="outline" size="sm" className="bg-white/5 border-white/15" disabled={thumbUploading}>
                {thumbUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                {thumbUploading ? "Uploading..." : "Choose Poster"}
              </Button>
              {data.thumbnail_url && <img src={data.thumbnail_url} className="h-12 w-10 object-cover rounded" alt="thumb" />}
            </div>
          </div>

          {/* Video */}
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Video File or URL *</label>
            <Input value={data.video_url} onChange={e => set("video_url", e.target.value)} placeholder="https://..." className={inputCls} style={style} />
            <div className="flex items-center gap-2 mt-2">
              <span className="text-gray-500 text-xs">— or —</span>
              <input type="file" accept="video/*" id="content-video" className="hidden" onChange={e => handleVideoUpload(e.target.files?.[0])} />
              <Button type="button" onClick={() => document.getElementById("content-video").click()} variant="outline" size="sm" className="bg-white/5 border-white/15" disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                {uploading ? "Uploading..." : "Upload Video File"}
              </Button>
            </div>
            {data.video_url && data.video_url.startsWith("http") && !uploading && (
              <p className="text-green-400 text-xs mt-1">✓ Video ready</p>
            )}
          </div>

          {/* Monetization */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              Monetization
            </p>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={data.is_monetized} onChange={e => set("is_monetized", e.target.checked)} className="w-4 h-4 accent-green-500" />
              <span className="text-white text-sm">Enable paid access</span>
            </label>
            {data.is_monetized && (
              <div className="space-y-3 pl-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Buy Price ($)</label>
                    <Input type="number" min="0" step="0.01" value={data.price_usd} onChange={e => set("price_usd", e.target.value)} placeholder="9.99" className={inputCls} style={style} />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Rent Price ($)</label>
                    <Input type="number" min="0" step="0.01" value={data.rental_price_usd} onChange={e => set("rental_price_usd", e.target.value)} placeholder="3.99" className={inputCls} style={style} />
                  </div>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-green-300 text-xs font-semibold mb-1">Your earnings</p>
                  <p className="text-green-400 text-xs">You earn <strong>85%</strong> of every sale. Platform takes 15%.</p>
                  {data.price_usd && <p className="text-green-300 text-xs mt-1">Buy: ${(parseFloat(data.price_usd) * 0.85).toFixed(2)} per sale</p>}
                  {data.rental_price_usd && <p className="text-green-300 text-xs">Rent: ${(parseFloat(data.rental_price_usd) * 0.85).toFixed(2)} per rental</p>}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer mt-3">
              <input type="checkbox" checked={data.requires_subscription} onChange={e => set("requires_subscription", e.target.checked)} className="w-4 h-4 accent-purple-500" />
              <span className="text-white text-sm">Subscription-only access</span>
            </label>
          </div>

          {/* Publish */}
          <Button
            onClick={handlePublish}
            disabled={uploading || !data.title || !data.video_url}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 h-12 font-bold text-base"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Publishing...</>
            ) : (
              <><Film className="w-4 h-4 mr-2" /> Publish {data.type === "series" ? "TV Show" : "Movie"}</>
            )}
          </Button>
          <p className="text-gray-600 text-xs text-center pb-2">Content will appear in the streaming feed and recommendations immediately.</p>
        </div>
      </motion.div>
    </div>
  );
}
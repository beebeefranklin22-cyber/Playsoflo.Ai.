import React, { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, Video, Image, Loader2, CheckCircle, CloudUpload, Link } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function DirectUploadModal({ isOpen, onClose, currentUser, onSuccess }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "", description: "", category: "entertainment", type: "movie",
    is_monetized: false, price_usd: 0, rental_price_usd: 0,
  });
  const [videoMode, setVideoMode] = useState("file"); // "file" | "url"
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [videoUploadState, setVideoUploadState] = useState("idle"); // idle | uploading | done | error
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [thumbUploading, setThumbUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const uploadedVideoUrlRef = useRef(null);
  const videoInputRef = useRef(null);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const startBackgroundVideoUpload = useCallback(async (file) => {
    setVideoUploadState("uploading");
    uploadedVideoUrlRef.current = null;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedVideoUrlRef.current = file_url;
      setVideoUploadState("done");
      toast.success("Video upload complete!");
    } catch {
      setVideoUploadState("error");
      toast.error("Video upload failed. Retry or paste a URL.");
    }
  }, []);

  const handleVideoFileSelect = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024 * 1024) { toast.error("Max file size is 10GB"); return; }
    setVideoFile(file);
    uploadedVideoUrlRef.current = null;
    startBackgroundVideoUpload(file);
    toast.info("Upload started in background — fill out the form while it uploads!");
  };

  const handleThumbSelect = async (file) => {
    if (!file) return;
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
    setThumbUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setThumbFile({ ...file, uploaded_url: file_url });
      setThumbUploading(false);
    } catch {
      toast.error("Thumbnail upload failed");
      setThumbUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!form.title) { toast.error("Title is required"); return; }
    const finalVideoUrl = videoMode === "url" ? videoUrl : uploadedVideoUrlRef.current;

    if (videoMode === "url" && !videoUrl) { toast.error("Enter a video URL"); return; }
    if (videoMode === "file" && !videoFile) { toast.error("Select a video file"); return; }

    if (videoMode === "file" && videoUploadState === "uploading") {
      toast.info("Video still uploading — publishing now, it'll appear once upload finishes.");
    }

    setPublishing(true);
    try {
      const thumbUrl = thumbFile?.uploaded_url || null;
      const record = await base44.entities.StreamingContent.create({
        title: form.title,
        description: form.description,
        type: form.type,
        category: form.category,
        video_url: finalVideoUrl || "",
        thumbnail_url: thumbUrl || "",
        is_live: false,
        is_monetized: form.is_monetized,
        price_usd: parseFloat(form.price_usd) || 0,
        rental_price_usd: parseFloat(form.rental_price_usd) || 0,
        status: "published",
        creator_email: currentUser.email,
        creator_username: currentUser.username || currentUser.full_name,
      });

      toast.success("Content published!");
      queryClient.invalidateQueries({ queryKey: ["my-vod-content"] });
      onSuccess?.(record);

      // Patch video URL once upload finishes (if still in progress)
      if (videoMode === "file" && !uploadedVideoUrlRef.current && record?.id) {
        const patch = async () => {
          let tries = 0;
          while (!uploadedVideoUrlRef.current && tries < 120) {
            await new Promise(r => setTimeout(r, 3000));
            tries++;
          }
          if (uploadedVideoUrlRef.current) {
            await base44.entities.StreamingContent.update(record.id, { video_url: uploadedVideoUrlRef.current }).catch(() => {});
            toast.success("Video is now fully available to viewers!");
          }
        };
        patch();
      }

      onClose();
    } catch (e) {
      toast.error("Publish failed: " + e.message);
    } finally {
      setPublishing(false);
    }
  };

  if (!isOpen) return null;

  const inputCls = "bg-white/10 border-white/20 text-white placeholder-gray-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-[#18181b] rounded-3xl max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#18181b] px-6 pt-6 pb-4 border-b border-white/10 z-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Upload Video</h2>
            <p className="text-gray-500 text-sm">Upload long-form content, shows, movies, or any video</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5 text-white" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Video section */}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2 block">Video Source *</label>
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-3">
              <button onClick={() => setVideoMode("file")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${videoMode === "file" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}>
                <CloudUpload className="w-4 h-4" /> Upload File
              </button>
              <button onClick={() => setVideoMode("url")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${videoMode === "url" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
                <Link className="w-4 h-4" /> Paste URL
              </button>
            </div>

            {videoMode === "url" ? (
              <div>
                <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://... MP4, HLS, YouTube, Vimeo, or any video URL"
                  className={inputCls} />
                {videoUrl && <p className="text-green-400 text-xs mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> URL set — instant, no upload needed</p>}
              </div>
            ) : (
              <div>
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
                  onChange={e => handleVideoFileSelect(e.target.files?.[0])} />
                {!videoFile ? (
                  <button onClick={() => videoInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-white/20 rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-purple-500/50 hover:bg-white/3 transition">
                    <CloudUpload className="w-10 h-10 text-gray-500" />
                    <div className="text-center">
                      <p className="text-white font-semibold">Click to choose video</p>
                      <p className="text-gray-500 text-sm mt-1">MP4, MOV, AVI, MKV, WebM — up to 10GB</p>
                      <p className="text-purple-400 text-xs mt-1">Uploads in background — fill out the form while it uploads!</p>
                    </div>
                  </button>
                ) : (
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <div className="p-3 bg-white/5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-600/30 flex items-center justify-center flex-shrink-0">
                        <Video className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{videoFile.name}</p>
                        <p className="text-gray-500 text-xs">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button onClick={() => { setVideoFile(null); setVideoUploadState("idle"); uploadedVideoUrlRef.current = null; }}
                        className="p-1 hover:bg-white/10 rounded-full">
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    {/* Status */}
                    <div className={`px-4 py-2.5 flex items-center gap-2 text-sm ${
                      videoUploadState === "done" ? "bg-green-500/10" :
                      videoUploadState === "error" ? "bg-red-500/10" : "bg-blue-500/10"}`}>
                      {videoUploadState === "uploading" && (
                        <><Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                        <span className="text-blue-300">Uploading in background — keep filling out details below</span></>
                      )}
                      {videoUploadState === "done" && (
                        <><CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-green-300">Upload complete!</span></>
                      )}
                      {videoUploadState === "error" && (
                        <><X className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-red-300">Upload failed</span>
                        <button onClick={() => startBackgroundVideoUpload(videoFile)} className="ml-auto text-red-400 text-xs underline">Retry</button></>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Thumbnail */}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2 block">Thumbnail</label>
            <input type="file" accept="image/*" id="du-thumb" className="hidden"
              onChange={e => handleThumbSelect(e.target.files?.[0])} />
            <div className="flex items-center gap-3">
              <Button type="button" onClick={() => document.getElementById("du-thumb").click()} variant="outline" size="sm"
                className="bg-white/5 border-white/15 text-gray-300" disabled={thumbUploading}>
                {thumbUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Image className="w-4 h-4 mr-1" />}
                {thumbUploading ? "Uploading..." : "Choose Image"}
              </Button>
              {thumbPreview && <img src={thumbPreview} className="h-12 w-20 object-cover rounded-lg" alt="preview" />}
            </div>
          </div>

          {/* Details */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Title *</label>
            <Input value={form.title} onChange={e => setF("title", e.target.value)} placeholder="Video title" className={inputCls} />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Description</label>
            <Textarea value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Describe your content..." className={inputCls} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Type</label>
              <Select value={form.type} onValueChange={v => setF("type", v)}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">Movie</SelectItem>
                  <SelectItem value="series">TV Series</SelectItem>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="music_concert">Concert/Music</SelectItem>
                  <SelectItem value="gaming_stream">Gaming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Category</label>
              <Select value={form.category} onValueChange={v => setF("category", v)}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="lifestyle">Lifestyle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Monetization */}
          <div className="border-t border-white/10 pt-4">
            <label className="flex items-center gap-2 text-white cursor-pointer mb-3">
              <input type="checkbox" checked={form.is_monetized} onChange={e => setF("is_monetized", e.target.checked)} className="w-4 h-4 accent-purple-500" />
              Enable monetization
            </label>
            <AnimatePresence>
              {form.is_monetized && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="grid grid-cols-2 gap-4 pl-6 pb-2">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Buy Price ($)</label>
                      <Input type="number" min="0" step="0.01" value={form.price_usd}
                        onChange={e => setF("price_usd", e.target.value)} placeholder="9.99" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Rent Price ($)</label>
                      <Input type="number" min="0" step="0.01" value={form.rental_price_usd}
                        onChange={e => setF("rental_price_usd", e.target.value)} placeholder="3.99" className={inputCls} />
                    </div>
                  </div>
                  <p className="text-green-400 text-xs pl-6 pb-2">You earn 85% per sale · Platform takes 15%</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pb-2">
            <Button
              onClick={handlePublish}
              disabled={publishing || !form.title || (videoMode === "url" && !videoUrl) || (videoMode === "file" && !videoFile)}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-bold h-12"
            >
              {publishing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publishing...</> :
               videoMode === "file" && videoUploadState === "uploading"
               ? <><Upload className="w-4 h-4 mr-2" />Publish (uploading in background)</>
               : <><Upload className="w-4 h-4 mr-2" />Publish</>}
            </Button>
            <Button onClick={onClose} disabled={publishing} variant="outline" className="bg-white/5 border-white/20">Cancel</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
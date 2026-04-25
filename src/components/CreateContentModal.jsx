import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X, Upload, Loader2, Music, Sparkles, AtSign, MapPin, Search,
  Type, Image as ImageIcon, Palette, Video, Smile, Pen, Filter,
  Clock, ChevronRight, ChevronLeft, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  { id: "story", label: "Story", icon: Clock, desc: "Visible 24 hours", gradient: "from-orange-500 to-pink-500" },
  { id: "post",  label: "Post",  icon: ImageIcon, desc: "Stays on your profile", gradient: "from-purple-600 to-pink-600" },
  { id: "reel",  label: "Reel",  icon: Video, desc: "Short-form video", gradient: "from-cyan-500 to-blue-600" },
];

const VIBES = ["energetic", "chill", "luxury", "adventure", "romantic", "party"];
const EXPERIENCE_TYPES = ["yacht", "exotic_car", "wine_tasting", "nightlife", "adventure", "dining", "wellness"];

const BG_GRADIENTS = [
  { id: "sunset",   cls: "from-orange-500 via-pink-500 to-purple-600",  label: "🌅" },
  { id: "ocean",    cls: "from-blue-600 via-cyan-400 to-teal-300",       label: "🌊" },
  { id: "fire",     cls: "from-red-600 via-orange-500 to-yellow-400",    label: "🔥" },
  { id: "forest",   cls: "from-green-600 via-emerald-500 to-lime-400",   label: "🌲" },
  { id: "royal",    cls: "from-purple-600 via-pink-600 to-rose-500",     label: "👑" },
  { id: "midnight", cls: "from-indigo-900 via-purple-900 to-black",      label: "🌙" },
];

const FILTERS = [
  { id: "none",     label: "None",  style: {} },
  { id: "vivid",    label: "Vivid", style: { filter: "saturate(1.8) contrast(1.1)" } },
  { id: "warm",     label: "Warm",  style: { filter: "sepia(0.4) saturate(1.4)" } },
  { id: "cool",     label: "Cool",  style: { filter: "hue-rotate(30deg) saturate(1.2)" } },
  { id: "mono",     label: "Mono",  style: { filter: "grayscale(1)" } },
  { id: "fade",     label: "Fade",  style: { filter: "opacity(0.75) saturate(0.6)" } },
  { id: "dramatic", label: "Drama", style: { filter: "contrast(1.5) brightness(0.85)" } },
];

const DRAW_COLORS = ["#ff3388","#ff6600","#ffdd00","#00ff88","#00bbff","#aa44ff","#ffffff","#000000"];
const POPULAR_EMOJIS = ["😂","❤️","🔥","😍","🎉","💯","✨","😭","🙌","💪","🥰","😎","🎶","💫","🌟","👀","🤩","💥","🎵","🌈"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreateContentModal({ isOpen, onClose, currentUser, defaultType }) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState("type"); // "type" | "create"
  const [contentType, setContentType] = useState(null);

  // Media state
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFileType, setMediaFileType] = useState("image");

  // Content state
  const [caption, setCaption] = useState("");
  const [textContent, setTextContent] = useState("");
  const [location, setLocation] = useState("");
  const [music, setMusic] = useState("");
  const [audioName, setAudioName] = useState("");
  const [vibe, setVibe] = useState("");
  const [isExperience, setIsExperience] = useState(false);
  const [experienceType, setExperienceType] = useState("");
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [textBg, setTextBg] = useState("sunset");

  // Tool state
  const [activeTool, setActiveTool] = useState("media");
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [emojiOverlays, setEmojiOverlays] = useState([]);
  const [drawMode, setDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState("#ff3388");
  const [isDrawing, setIsDrawing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [musicQuery, setMusicQuery] = useState("");
  const [gifQuery, setGifQuery] = useState("");
  const [draggingEmoji, setDraggingEmoji] = useState(null); // { id, startX, startY, origX, origY }

  const canvasRef = useRef(null);
  const lastPos = useRef(null);
  const previewRef = useRef(null);

  // Music search
  const { data: musicResults = [] } = useQuery({
    queryKey: ["music-search", musicQuery],
    queryFn: async () => {
      if (musicQuery.length < 2) return [];
      const { data } = await base44.functions.invoke("fetchYouTubeMusic", { query: musicQuery, limit: 6 });
      return data?.tracks || [];
    },
    enabled: musicQuery.length >= 2,
    staleTime: 30000,
  });

  // Reset & init when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
      if (defaultType) {
        setContentType(defaultType);
        setStep("create");
      } else {
        setContentType(null);
        setStep("type");
      }
    }
  }, [isOpen, defaultType]);

  const resetForm = () => {
    setMediaUrl(""); setMediaFileType("image");
    setCaption(""); setTextContent(""); setLocation("");
    setMusic(""); setAudioName(""); setVibe("");
    setIsExperience(false); setExperienceType("");
    setTaggedUsers([]); setTagInput("");
    setTextBg("sunset"); setSelectedFilter("none");
    setEmojiOverlays([]); setDrawMode(false);
    setActiveTool("media"); setMusicQuery(""); setGifQuery("");
    setTimeout(() => {
      const ctx = canvasRef.current?.getContext("2d");
      ctx?.clearRect(0, 0, 9999, 9999);
    }, 50);
  };

  // ── Upload helpers ──────────────────────────────────────────────────────────

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { toast.error("File too large. Max 100MB"); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMediaUrl(file_url);
      setMediaFileType(file.type.startsWith("video") ? "video" : "image");
      toast.success("Media uploaded!");
    } catch (e) {
      toast.error("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAudioUpload = async (file) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Audio too large. Max 20MB"); return; }
    setUploading(true);
    try {
      await base44.integrations.Core.UploadFile({ file });
      setMusic(file.name); setAudioName(file.name);
      toast.success("Audio added!");
    } catch (e) {
      toast.error("Audio upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ── Canvas draw ─────────────────────────────────────────────────────────────

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e) => {
    if (!drawMode || !canvasRef.current) return;
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, 9999, 9999);
  };

  // ── Emoji overlay ───────────────────────────────────────────────────────────

  const addEmoji = (emoji) => {
    setEmojiOverlays(prev => [...prev, { id: Date.now(), emoji, x: 80, y: 80, size: 40 }]);
  };

  const removeEmoji = (id) => setEmojiOverlays(prev => prev.filter(e => e.id !== id));

  const startEmojiDrag = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches ? e.touches[0] : e;
    const overlay = emojiOverlays.find(o => o.id === id);
    setDraggingEmoji({ id, startX: touch.clientX, startY: touch.clientY, origX: overlay.x, origY: overlay.y });
  };

  const onEmojiDragMove = (e) => {
    if (!draggingEmoji) return;
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - draggingEmoji.startX;
    const dy = touch.clientY - draggingEmoji.startY;
    setEmojiOverlays(prev => prev.map(o =>
      o.id === draggingEmoji.id ? { ...o, x: draggingEmoji.origX + dx, y: draggingEmoji.origY + dy } : o
    ));
  };

  const onEmojiDragEnd = () => setDraggingEmoji(null);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const post = await base44.entities.SocialPost.create({
        image_url: mediaUrl,
        caption, location,
        music_playing: music,
        vibe, is_experience: isExperience, experience_type: experienceType,
        likes_count: 0, comments_count: 0,
        author_email: currentUser?.email,
        author_name: currentUser?.full_name,
      });
      if (currentUser) {
        const followers = await base44.entities.Follow.filter({ following_email: currentUser.email });
        await Promise.all(followers.slice(0, 50).map(f =>
          base44.entities.Notification.create({
            recipient_email: f.follower_email, type: "new_post",
            title: `${currentUser.full_name || "Someone"} posted`,
            message: caption?.substring(0, 100) || "New post",
            sender_email: currentUser.email, sender_name: currentUser.full_name,
            sender_photo: currentUser.profile_picture,
            reference_id: post.id, reference_type: "post", read: false,
          }).catch(() => {})
        ));
      }
      return post;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["social-posts"] }); toast.success("Post shared!"); onClose(); },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const createStoryMutation = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours() + 24);
      const url = mediaUrl || (textContent ? "__text__" : "");
      return await base44.entities.Story.create({
        media_url: url,
        media_type: mediaUrl ? mediaFileType : "text",
        caption: caption || textContent,
        music,
        creator_profile_picture: currentUser?.profile_picture || currentUser?.profile_photo,
        creator_name: currentUser?.full_name || currentUser?.username,
        expires_at: expiresAt.toISOString(),
        views: [],
        visibility: "followers",
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stories"] }); toast.success("Story shared!"); onClose(); },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const createReelMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.Reel.create({
        creator_email: currentUser?.email,
        creator_name: currentUser?.full_name || currentUser?.username,
        creator_photo: currentUser?.profile_picture,
        video_url: mediaUrl, caption,
        audio_name: audioName || music,
        tags: taggedUsers,
        likes_count: 0, comments_count: 0, views_count: 0, shares_count: 0,
        is_public: true,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reels"] }); toast.success("Reel published!"); onClose(); },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const isPending = createPostMutation.isPending || createStoryMutation.isPending || createReelMutation.isPending;

  const handlePublish = () => {
    const hasMedia = !!mediaUrl;
    const hasText = !!(caption || textContent);

    if (!hasMedia && !hasText) { toast.error("Add media or text first"); return; }
    if (contentType === "reel" && !mediaUrl) { toast.error("Add a video for your reel"); return; }
    if (contentType === "post" && !mediaUrl) { toast.error("Add media for your post"); return; }
    if (contentType === "story") createStoryMutation.mutate();
    else if (contentType === "post") createPostMutation.mutate();
    else createReelMutation.mutate();
  };

  if (!isOpen) return null;

  const filterStyle = FILTERS.find(f => f.id === selectedFilter)?.style || {};
  const selectedBg = BG_GRADIENTS.find(b => b.id === textBg);
  const hasMedia = !!mediaUrl;
  const isTextOnlyStory = !mediaUrl && contentType === "story" && textContent;

  const toolTabs = [
    { id: "media",  icon: ImageIcon, label: "Media" },
    { id: "text",   icon: Type,      label: "Text",   show: contentType !== "reel" },
    { id: "music",  icon: Music,     label: "Music" },
    { id: "emoji",  icon: Smile,     label: "Emoji",  show: hasMedia || isTextOnlyStory },
    { id: "draw",   icon: Pen,       label: "Draw",   show: hasMedia && contentType !== "reel" },
    { id: "filter", icon: Filter,    label: "Filter", show: hasMedia },
    { id: "tag",    icon: AtSign,    label: "Tag" },
    { id: "gif",    icon: Sparkles,  label: "GIF",    show: contentType !== "reel" },
  ].filter(t => t.show !== false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)]"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[#111] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: "calc(100vh - 80px)", height: "calc(100vh - 80px)" }}
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              {step === "create" && !defaultType && (
                <button onClick={() => setStep("type")} className="p-1.5 hover:bg-white/10 rounded-full transition">
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
              )}
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">
                  {step === "type" ? "Create" : `New ${contentType === "story" ? "Story" : contentType === "reel" ? "Reel" : "Post"}`}
                </h2>
                {step === "create" && contentType === "story" && (
                  <p className="text-gray-500 text-xs">Visible for 24 hours</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* ── STEP 1 — Type Selector ──────────────────────────────────────── */}
          {step === "type" && (
            <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
              <p className="text-gray-400 text-sm">What would you like to share?</p>

              {currentUser && (
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                    {currentUser?.full_name?.[0] || "U"}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{currentUser.full_name}</p>
                    <p className="text-gray-500 text-xs">@{currentUser.username || currentUser.email?.split("@")[0]}</p>
                  </div>
                </div>
              )}

              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => { setContentType(type.id); setStep("create"); setActiveTool("media"); }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition text-left group"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <type.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold">{type.label}</p>
                    <p className="text-gray-400 text-sm">{type.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition" />
                </button>
              ))}
            </div>
          )}

          {/* ── STEP 2 — Creator ─────────────────────────────────────────────── */}
          {step === "create" && (
            <>
              {hasMedia ? (
                <div
                  ref={previewRef}
                  className="relative flex-shrink-0 bg-black select-none"
                  style={{ height: 220 }}
                  onMouseMove={draggingEmoji ? onEmojiDragMove : undefined}
                  onMouseUp={draggingEmoji ? onEmojiDragEnd : undefined}
                  onTouchMove={draggingEmoji ? onEmojiDragMove : undefined}
                  onTouchEnd={draggingEmoji ? onEmojiDragEnd : undefined}
                >
                  {mediaFileType === "video" ? (
                    <video src={mediaUrl} className="w-full h-full object-contain" style={filterStyle} controls={false} />
                  ) : (
                    <img src={mediaUrl} alt="preview" className="w-full h-full object-contain" style={filterStyle} />
                  )}
                  <canvas
                    ref={canvasRef}
                    width={460} height={220}
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: drawMode ? "auto" : "none", cursor: drawMode ? "crosshair" : "default" }}
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
                  />
                  {emojiOverlays.map((e) => (
                    <div key={e.id} className="absolute group"
                      style={{ left: e.x, top: e.y, fontSize: e.size, lineHeight: 1, cursor: "grab", userSelect: "none", touchAction: "none" }}
                      onMouseDown={(ev) => startEmojiDrag(ev, e.id)}
                      onTouchStart={(ev) => startEmojiDrag(ev, e.id)}
                    >
                      <span>{e.emoji}</span>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); removeEmoji(e.id); }}
                        className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ))}
                  {caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-white text-xs font-medium line-clamp-2">{caption}</p>
                    </div>
                  )}
                  {textContent && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-white text-xl font-bold text-center px-6 leading-relaxed drop-shadow-lg">{textContent}</p>
                    </div>
                  )}
                  {music && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 rounded-full px-2 py-1">
                      <Music className="w-3 h-3 text-pink-400 animate-pulse" />
                      <span className="text-white text-[10px] max-w-[100px] truncate">{music}</span>
                    </div>
                  )}
                  <button onClick={() => setMediaUrl("")}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition">
                    <X className="w-4 h-4 text-white" />
                  </button>
                  {drawMode && (
                    <div className="absolute top-2 left-2 bg-purple-600/90 rounded-full px-2 py-1 text-white text-xs font-semibold">
                      ✏️ Drawing
                    </div>
                  )}
                </div>
              ) : isTextOnlyStory ? (
                <div
                  className={`relative flex-shrink-0 bg-gradient-to-br ${selectedBg?.cls} flex items-center justify-center select-none`}
                  style={{ height: 220 }}
                  onMouseMove={draggingEmoji ? onEmojiDragMove : undefined}
                  onMouseUp={draggingEmoji ? onEmojiDragEnd : undefined}
                  onTouchMove={draggingEmoji ? onEmojiDragMove : undefined}
                  onTouchEnd={draggingEmoji ? onEmojiDragEnd : undefined}
                >
                  <p className="text-white text-xl font-bold text-center px-6 leading-relaxed">{textContent}</p>
                  {emojiOverlays.map((e) => (
                    <div key={e.id} className="absolute group"
                      style={{ left: e.x, top: e.y, fontSize: e.size, lineHeight: 1, cursor: "grab", userSelect: "none", touchAction: "none" }}
                      onMouseDown={(ev) => startEmojiDrag(ev, e.id)}
                      onTouchStart={(ev) => startEmojiDrag(ev, e.id)}
                    >
                      <span>{e.emoji}</span>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); removeEmoji(e.id); }}
                        className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-shrink-0 bg-black/40 flex items-center justify-center" style={{ height: 100 }}>
                  <p className="text-gray-600 text-sm">
                    {contentType === "reel" ? "Upload a video to preview" : "Upload media or add text to preview"}
                  </p>
                </div>
              )}

              {/* ── Tool Tab Bar ─────────────────────────────────────────── */}
              <div className="flex-shrink-0 border-t border-b border-white/10 bg-black/40">
                <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {toolTabs.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTool(tab.id)}
                      className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 text-xs font-medium transition border-b-2 ${
                        activeTool === tab.id ? "border-purple-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
                      }`}>
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Tool Panels ──────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">

                  {activeTool === "media" && (
                    <div className="space-y-3">
                      {!hasMedia ? (
                        <label className="block cursor-pointer">
                          <input type="file" className="hidden"
                            accept={contentType === "reel" ? "video/*" : "image/*,video/*"}
                            onChange={(e) => handleFileUpload(e.target.files?.[0])} />
                          <div className="border-2 border-dashed border-white/20 rounded-2xl p-10 text-center hover:border-purple-500/50 hover:bg-purple-500/5 transition">
                            {uploading ? (
                              <><Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-2" /><p className="text-gray-400">Uploading...</p></>
                            ) : (
                              <>
                                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                                  <Upload className="w-7 h-7 text-white" />
                                </div>
                                <p className="text-white font-semibold mb-1">
                                  {contentType === "reel" ? "Upload Video" : "Upload Media"}
                                </p>
                                <p className="text-gray-500 text-sm">
                                  {contentType === "reel" ? "MP4, MOV • Max 100MB" : "JPG, PNG, MP4 • Max 100MB"}
                                </p>
                              </>
                            )}
                          </div>
                        </label>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            {mediaFileType === "video" ? <Video className="w-5 h-5 text-white" /> : <ImageIcon className="w-5 h-5 text-white" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">Media ready</p>
                            <p className="text-gray-400 text-xs capitalize">{mediaFileType} uploaded</p>
                          </div>
                          <button onClick={() => setMediaUrl("")} className="p-1.5 hover:bg-white/10 rounded-lg transition">
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="text-gray-400 text-xs mb-1.5 block">Caption</label>
                        <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                          placeholder={contentType === "reel" ? "Describe your reel..." : "Write a caption..."}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-3 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                          rows={3} maxLength={300} />
                        <p className="text-gray-600 text-xs mt-1">{caption.length}/300</p>
                      </div>

                      {contentType !== "reel" && (
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input value={location} onChange={(e) => setLocation(e.target.value)}
                            placeholder="Add location" className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-500 h-10" />
                        </div>
                      )}

                      {contentType === "post" && (
                        <div>
                          <label className="text-gray-400 text-xs mb-2 block">Vibe</label>
                          <div className="flex flex-wrap gap-2">
                            {VIBES.map(v => (
                              <button key={v} type="button" onClick={() => setVibe(prev => prev === v ? "" : v)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${vibe === v ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}
                              >{v}</button>
                            ))}
                          </div>
                        </div>
                      )}

                      {contentType === "post" && (
                        <>
                          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                            <input type="checkbox" checked={isExperience}
                              onChange={(e) => { setIsExperience(e.target.checked); if (!e.target.checked) setExperienceType(""); }}
                              className="w-4 h-4 accent-purple-500" />
                            <label className="text-white font-medium text-sm flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-yellow-400" /> Mark as Experience
                            </label>
                          </div>
                          {isExperience && (
                            <div className="flex flex-wrap gap-2">
                              {EXPERIENCE_TYPES.map(t => (
                                <button key={t} type="button" onClick={() => setExperienceType(t)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${experienceType === t ? "bg-yellow-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}
                                >{t.replace(/_/g, " ")}</button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {activeTool === "text" && (
                    <div className="space-y-4">
                      {contentType === "story" && !hasMedia && (
                        <p className="text-gray-400 text-xs">Write text for a text-only story, or upload media in the Media tab first to overlay text on it.</p>
                      )}
                      {contentType === "post" && !hasMedia && (
                        <p className="text-yellow-500 text-xs">⚠️ Upload media in the Media tab first to add a text overlay.</p>
                      )}
                      <div>
                        <label className="text-gray-400 text-xs mb-1.5 block">
                          {hasMedia ? "Text overlay on media" : contentType === "story" ? "Story text (text-only story)" : "Text"}
                        </label>
                        <textarea
                          value={hasMedia ? textContent : (contentType === "story" ? textContent : caption)}
                          onChange={(e) => {
                            if (hasMedia) setTextContent(e.target.value);
                            else if (contentType === "story") setTextContent(e.target.value);
                            else setCaption(e.target.value);
                          }}
                          placeholder="What's on your mind?"
                          className="w-full bg-white/5 border border-white/10 text-white text-lg rounded-xl p-4 placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                          rows={4} maxLength={200} />
                        <p className="text-gray-500 text-xs">{textContent.length}/200</p>
                      </div>
                      {contentType === "story" && !hasMedia && (
                        <div>
                          <label className="text-gray-400 text-xs mb-2 block">Background Color</label>
                          <div className="grid grid-cols-6 gap-2">
                            {BG_GRADIENTS.map(bg => (
                              <button key={bg.id} type="button" onClick={() => setTextBg(bg.id)}
                                className={`h-12 rounded-lg bg-gradient-to-br ${bg.cls} text-lg flex items-center justify-center transition-all ${textBg === bg.id ? "ring-2 ring-white scale-105" : "opacity-70 hover:opacity-100"}`}
                              >{bg.label}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTool === "music" && (
                    <div className="space-y-3">
                      {music ? (
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Music className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium truncate">{music}</p>
                            <p className="text-gray-400 text-xs">Music added</p>
                          </div>
                          <button onClick={() => { setMusic(""); setAudioName(""); }} className="p-1.5 hover:bg-white/10 rounded-lg">
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input value={musicQuery} onChange={(e) => setMusicQuery(e.target.value)}
                              placeholder="Search songs..." className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-500" />
                          </div>
                          {musicResults.length > 0 && (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {musicResults.map((track, i) => (
                                <button key={i} type="button"
                                  onClick={() => { setMusic(`${track.artist} - ${track.title}`); setMusicQuery(""); toast.success("Music added!"); }}
                                  className="w-full text-left p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Music className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-white text-xs font-medium truncate">{track.title}</p>
                                    <p className="text-gray-400 text-[10px] truncate">{track.artist}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          <label className="block cursor-pointer">
                            <input type="file" className="hidden" accept="audio/*" onChange={(e) => handleAudioUpload(e.target.files?.[0])} />
                            <div className="p-3 border border-dashed border-white/20 rounded-xl hover:border-purple-500/40 transition text-center">
                              <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                              <p className="text-white text-xs font-medium">Upload audio file</p>
                              <p className="text-gray-500 text-xs">MP3, M4A • Max 20MB</p>
                            </div>
                          </label>
                        </>
                      )}
                    </div>
                  )}

                  {activeTool === "emoji" && (
                    <div className="space-y-3">
                      <p className="text-gray-400 text-xs">Tap to add · Drag to move · Tap × to remove</p>
                      <div className="grid grid-cols-5 gap-2">
                        {POPULAR_EMOJIS.map((emoji) => (
                          <button key={emoji} onClick={() => addEmoji(emoji)}
                            className="h-12 text-2xl bg-white/5 rounded-xl hover:bg-white/15 transition flex items-center justify-center">
                            {emoji}
                          </button>
                        ))}
                      </div>
                      {emojiOverlays.length > 0 && (
                        <div className="pt-2 border-t border-white/10">
                          <p className="text-gray-500 text-xs mb-2">Active overlays — hover to remove</p>
                          <div className="flex flex-wrap gap-2">
                            {emojiOverlays.map((e) => (
                              <div key={e.id} className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                                <span className="text-lg">{e.emoji}</span>
                                <button onClick={() => removeEmoji(e.id)} className="text-red-400 hover:text-red-300"><X className="w-3 h-3" /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTool === "draw" && (
                    <div className="space-y-3">
                      {!hasMedia ? (
                        <p className="text-yellow-500 text-xs">⚠️ Upload media in the Media tab first to draw on it.</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <button onClick={() => setDrawMode(!drawMode)}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${drawMode ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
                              {drawMode ? "✏️ Drawing ON — draw on preview above" : "Start Drawing"}
                            </button>
                            <button onClick={clearCanvas}
                              className="px-4 py-2.5 rounded-xl bg-white/10 text-gray-300 text-sm hover:bg-white/20 transition">
                              Clear
                            </button>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs mb-2">Brush color</p>
                            <div className="flex gap-2 flex-wrap">
                              {DRAW_COLORS.map(c => (
                                <button key={c} onClick={() => setDrawColor(c)}
                                  className={`w-9 h-9 rounded-full transition-all ${drawColor === c ? "ring-2 ring-white scale-110" : "hover:scale-105"}`}
                                  style={{ background: c }} />
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {activeTool === "filter" && (
                    <div className="space-y-3">
                      {!hasMedia ? (
                        <p className="text-yellow-500 text-xs">⚠️ Upload media in the Media tab first to apply filters.</p>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {FILTERS.map(f => (
                            <button key={f.id} onClick={() => setSelectedFilter(f.id)}
                              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition ${selectedFilter === f.id ? "bg-purple-600/30 border border-purple-500" : "bg-white/5 border border-white/10 hover:bg-white/10"}`}>
                              <div className="w-full aspect-square rounded-lg overflow-hidden">
                                <img src={mediaUrl} className="w-full h-full object-cover" style={f.style} alt={f.label} />
                              </div>
                              <p className="text-xs text-gray-300">{f.label}</p>
                              {selectedFilter === f.id && <Check className="w-3 h-3 text-purple-400" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTool === "tag" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && tagInput.trim()) {
                                setTaggedUsers(prev => [...prev, tagInput.trim()]);
                                setTagInput("");
                              }
                            }}
                            placeholder="@username, press Enter"
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-500" />
                        </div>
                        <button onClick={() => { if (tagInput.trim()) { setTaggedUsers(prev => [...prev, tagInput.trim()]); setTagInput(""); }}}
                          className="px-4 py-2 bg-purple-600 rounded-xl text-white text-sm font-semibold hover:bg-purple-700 transition">Add</button>
                      </div>
                      {taggedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {taggedUsers.map((u, i) => (
                            <span key={i} className="flex items-center gap-1.5 bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 rounded-full text-purple-300 text-sm">
                              <AtSign className="w-3 h-3" />{u}
                              <button onClick={() => setTaggedUsers(prev => prev.filter((_, j) => j !== i))} className="text-purple-400 hover:text-white ml-0.5">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTool === "gif" && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input value={gifQuery} onChange={(e) => setGifQuery(e.target.value)}
                          placeholder="Search GIFs..." className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-500" />
                      </div>
                      {gifQuery ? (
                        <div className="grid grid-cols-3 gap-2">
                          {[1,2,3,4,5,6].map(i => (
                            <button key={i} onClick={() => { toast.info("GIF integration coming soon!"); }}
                              className="aspect-square bg-white/5 rounded-xl hover:bg-white/10 transition border border-white/10 flex items-center justify-center">
                              <Sparkles className="w-6 h-6 text-gray-500" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <Sparkles className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">Search for GIFs above</p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* ── Publish Button ──────────────────────────────────────────── */}
              <div className="flex-shrink-0 p-4 border-t border-white/10">
                <Button onClick={handlePublish} disabled={isPending || uploading}
                  className={`w-full h-12 font-bold text-white bg-gradient-to-r ${
                    contentType === "story" ? "from-orange-500 to-pink-500" :
                    contentType === "reel"  ? "from-cyan-500 to-blue-600" :
                    "from-purple-600 to-pink-600"
                  } hover:opacity-90 rounded-xl`}>
                  {isPending
                    ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Sharing...</>
                    : `Share ${contentType === "story" ? "Story" : contentType === "reel" ? "Reel" : "Post"}`
                  }
                </Button>
              </div>
            </>
          )}

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
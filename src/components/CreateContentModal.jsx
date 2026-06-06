import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X, Upload, Loader2, Music, Sparkles, AtSign, MapPin, Search,
  Type, Image as ImageIcon, Video, Smile, Pen, SlidersHorizontal,
  Clock, ChevronRight, ChevronLeft, Check, Tag, Wand2, Trash2, Plus as PlusIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  { id: "story", label: "Story", icon: Clock,     desc: "Visible 24 hours",        gradient: "from-orange-500 to-pink-500" },
  { id: "post",  label: "Post",  icon: ImageIcon,  desc: "Stays on your profile",   gradient: "from-purple-600 to-pink-600" },
  { id: "reel",  label: "Reel",  icon: Video,      desc: "Short-form video",        gradient: "from-cyan-500 to-blue-600" },
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

// Right-side floating tool buttons
const TOOLS = [
  { id: "emoji",  icon: Smile,            label: "Sticker" },
  { id: "text",   icon: Type,             label: "Text" },
  { id: "draw",   icon: Pen,              label: "Draw" },
  { id: "filter", icon: SlidersHorizontal,label: "Filter" },
  { id: "music",  icon: Music,            label: "Music" },
  { id: "tag",    icon: Tag,              label: "Tag" },
  { id: "location",icon: MapPin,          label: "Location" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreateContentModal({ isOpen, onClose, currentUser, defaultType }) {
  const queryClient = useQueryClient();

  const [step, setStep]             = useState("type");
  const [contentType, setContentType] = useState(null);

  // Media
  const [mediaUrl, setMediaUrl]         = useState("");
  const [mediaFileType, setMediaFileType] = useState("image");

  // Content
  const [caption, setCaption]           = useState("");
  // Multiple text overlays — array of { id, text, x, y, color }
  const [textOverlays, setTextOverlays] = useState([]);
  const [activeTextId, setActiveTextId] = useState(null); // which text is being edited
  const [textBg, setTextBg]             = useState("sunset");
  const [location, setLocation]         = useState("");
  const [music, setMusic]               = useState("");
  const [audioName, setAudioName]       = useState("");
  const [vibe, setVibe]                 = useState("");
  const [isExperience, setIsExperience] = useState(false);
  const [experienceType, setExperienceType] = useState("");
  const [taggedUsers, setTaggedUsers]   = useState([]);
  const [tagInput, setTagInput]         = useState("");

  // Tool tray
  const [activeTool, setActiveTool]     = useState(null); // null = no tray open
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [emojiOverlays, setEmojiOverlays]   = useState([]);
  const [drawMode, setDrawMode]         = useState(false);
  const [drawColor, setDrawColor]       = useState("#ff3388");
  const [isDrawing, setIsDrawing]       = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [musicQuery, setMusicQuery]     = useState("");
  const [draggingEmoji, setDraggingEmoji] = useState(null);
  const [draggingTextId, setDraggingTextId] = useState(null);
  const [draggingTextStart, setDraggingTextStart] = useState(null);
  const [showTrashZone, setShowTrashZone] = useState(false);
  const [overTrash, setOverTrash] = useState(false);

  const canvasRef  = useRef(null);
  const lastPos    = useRef(null);
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

  useEffect(() => {
    if (isOpen) {
      resetForm();
      if (defaultType) { setContentType(defaultType); setStep("create"); }
      else { setContentType(null); setStep("type"); }
    }
  }, [isOpen, defaultType]);

  const resetForm = () => {
    setMediaUrl(""); setMediaFileType("image");
    setCaption(""); setTextOverlays([]); setActiveTextId(null); setLocation("");
    setMusic(""); setAudioName(""); setVibe("");
    setIsExperience(false); setExperienceType("");
    setTaggedUsers([]); setTagInput("");
    setTextBg("sunset"); setSelectedFilter("none");
    setEmojiOverlays([]); setDrawMode(false);
    setActiveTool(null); setMusicQuery("");
    setDraggingTextId(null); setShowTrashZone(false); setOverTrash(false);
    setTimeout(() => { const ctx = canvasRef.current?.getContext("2d"); ctx?.clearRect(0, 0, 9999, 9999); }, 50);
  };

  // ── Upload ──────────────────────────────────────────────────────────────────

  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) { toast.error("File too large. Max 500MB"); return; }
    setUploading(true);
    setUploadProgress(0);

    // Simulate smooth progress: fast to 70%, then slow crawl to 95%
    let progress = 0;
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 70) return Math.min(prev + Math.random() * 15, 70);
        if (prev < 95) return Math.min(prev + Math.random() * 2, 95);
        return prev;
      });
    }, 200);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      clearInterval(interval);
      setUploadProgress(100);
      setMediaUrl(file_url);
      setMediaFileType(file.type.startsWith("video") ? "video" : "image");
      toast.success("Media uploaded!");
    } catch (e) {
      clearInterval(interval);
      toast.error("Upload failed: " + e.message);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 600);
    }
  };

  const handleAudioUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      await base44.integrations.Core.UploadFile({ file });
      setMusic(file.name); setAudioName(file.name);
      toast.success("Audio added!");
    } catch (e) { toast.error("Audio upload failed"); }
    finally { setUploading(false); }
  };

  // ── Canvas draw ─────────────────────────────────────────────────────────────

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e) => { if (!drawMode || !canvasRef.current) return; e.preventDefault(); setIsDrawing(true); lastPos.current = getPos(e, canvasRef.current); };
  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return; e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y); ctx.strokeStyle = drawColor;
    ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.stroke();
    lastPos.current = pos;
  };
  const endDraw = () => setIsDrawing(false);
  const clearCanvas = () => { const ctx = canvasRef.current?.getContext("2d"); ctx?.clearRect(0, 0, 9999, 9999); };

  // ── Draggable text overlays (multi) ─────────────────────────────────────────
  const addTextOverlay = () => {
    const id = Date.now();
    setTextOverlays(prev => [...prev, { id, text: "", x: 60, y: 100, color: "#ffffff" }]);
    setActiveTextId(id);
  };

  const updateTextOverlay = (id, field, value) => {
    setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTextOverlay = (id) => {
    setTextOverlays(prev => prev.filter(t => t.id !== id));
    if (activeTextId === id) setActiveTextId(null);
  };

  const startTextDrag = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    const touch = e.touches ? e.touches[0] : e;
    const overlay = textOverlays.find(t => t.id === id);
    setDraggingTextId(id);
    setDraggingTextStart({ startX: touch.clientX, startY: touch.clientY, origX: overlay.x, origY: overlay.y });
    setShowTrashZone(true);
  };

  const onTextDragMove = (e) => {
    if (!draggingTextId || !draggingTextStart) return; e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - draggingTextStart.startX;
    const dy = touch.clientY - draggingTextStart.startY;
    const newX = draggingTextStart.origX + dx;
    const newY = draggingTextStart.origY + dy;
    setTextOverlays(prev => prev.map(t => t.id === draggingTextId ? { ...t, x: newX, y: newY } : t));
    // Check if over trash zone (bottom center of canvas)
    const canvasEl = previewRef.current;
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const inTrash = clientY > rect.bottom - 60 && clientX > rect.left + rect.width * 0.3 && clientX < rect.right - rect.width * 0.3;
      setOverTrash(inTrash);
    }
  };

  const onTextDragEnd = () => {
    if (overTrash && draggingTextId) {
      removeTextOverlay(draggingTextId);
    }
    setDraggingTextId(null);
    setDraggingTextStart(null);
    setShowTrashZone(false);
    setOverTrash(false);
  };

  // ── Emoji drag ──────────────────────────────────────────────────────────────

  const addEmoji = (emoji) => {
    setEmojiOverlays(prev => [...prev, { id: Date.now(), emoji, x: 120, y: 120, size: 44 }]);
    setActiveTool(null);
  };

  const removeEmoji = (id) => setEmojiOverlays(prev => prev.filter(e => e.id !== id));

  const startEmojiDrag = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    const touch = e.touches ? e.touches[0] : e;
    const overlay = emojiOverlays.find(o => o.id === id);
    setDraggingEmoji({ id, startX: touch.clientX, startY: touch.clientY, origX: overlay.x, origY: overlay.y });
  };

  const onEmojiDragMove = (e) => {
    if (!draggingEmoji) return; e.preventDefault();
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
        image_url: mediaUrl, caption, location, music_playing: music,
        vibe, is_experience: isExperience, experience_type: experienceType,
        likes_count: 0, comments_count: 0,
        is_story: false,
        media_type: mediaFileType,
        creator_name: currentUser?.full_name,
        creator_username: currentUser?.username || currentUser?.email?.split('@')[0],
        creator_profile_picture: currentUser?.profile_picture,
        liked_by: [],
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      queryClient.refetchQueries({ queryKey: ["social-posts"] });
      toast.success("Post shared! 🎉");
      onClose();
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const createStoryMutation = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours() + 24);
      return await base44.entities.Story.create({
        media_url: mediaUrl || "__text__",
        media_type: mediaUrl ? mediaFileType : "text",
        caption: caption || textOverlays.map(t => t.text).filter(Boolean).join(' | '),
        music,
        creator_profile_picture: currentUser?.profile_picture || currentUser?.profile_photo,
        creator_name: currentUser?.full_name || currentUser?.username,
        expires_at: expiresAt.toISOString(),
        views: [], visibility: "followers",
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
        likes_count: 0, comments_count: 0, views_count: 0, shares_count: 0, is_public: true,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reels"] }); toast.success("Reel published!"); onClose(); },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const isPending = createPostMutation.isPending || createStoryMutation.isPending || createReelMutation.isPending;

  const handlePublish = () => {
    const hasMedia = !!mediaUrl;
    const hasText  = !!(caption || textOverlays.some(t => t.text));
    if (!hasMedia && !hasText) { toast.error("Add media or text first"); return; }
    if (contentType === "reel" && !mediaUrl) { toast.error("Add a video for your reel"); return; }
    if (contentType === "post" && !mediaUrl) { toast.error("Add media for your post"); return; }
    if (contentType === "story") createStoryMutation.mutate();
    else if (contentType === "post") createPostMutation.mutate();
    else createReelMutation.mutate();
  };

  if (!isOpen) return null;

  const filterStyle  = FILTERS.find(f => f.id === selectedFilter)?.style || {};
  const selectedBg   = BG_GRADIENTS.find(b => b.id === textBg);
  const hasMedia     = !!mediaUrl;
  const isTextOnly   = !mediaUrl && contentType === "story" && textOverlays.some(t => t.text);
  const activeTextOverlay = textOverlays.find(t => t.id === activeTextId);

  // Which tools to show on the right rail (always visible once in create step)
  const visibleTools = TOOLS.filter(t => {
    if (t.id === "draw" && (!hasMedia || contentType === "reel")) return false;
    if (t.id === "filter" && !hasMedia) return false;
    if (t.id === "text" && contentType === "reel") return false;
    return true;
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)]"
        onClick={() => { if (activeTool) { setActiveTool(null); setDrawMode(false); } else onClose(); }}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[#111] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl flex flex-col"
          style={{ maxHeight: "calc(100dvh - 60px)", height: "calc(100dvh - 60px)" }}
        >

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              {step === "create" && !defaultType && (
                <button onClick={() => setStep("type")} className="p-1.5 hover:bg-white/10 rounded-full transition">
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
              )}
              {step === "type" && (
                <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              )}
              <h2 className="text-white font-bold text-base leading-tight">
                {step === "type" ? "Create" : `New ${contentType === "story" ? "Story" : contentType === "reel" ? "Reel" : "Post"}`}
              </h2>
            </div>
            {step === "create" && (
              <div className="flex items-center gap-2">
                {hasMedia && (
                  <label className="p-2 hover:bg-white/10 rounded-full transition cursor-pointer" title="Change media">
                    <input type="file" className="hidden"
                      accept={contentType === "reel" ? "video/*" : "image/*,video/*"}
                      onChange={(e) => handleFileUpload(e.target.files?.[0])} />
                    <ImageIcon className="w-5 h-5 text-gray-300" />
                  </label>
                )}
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            )}
          </div>

          {/* ── STEP 1 — Type Selector ──────────────────────────────────────── */}
          {step === "type" && (
            <div className="flex-1 flex flex-col px-5 pb-5 gap-4 overflow-y-auto">
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
                  onClick={() => { setContentType(type.id); setStep("create"); }}
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

          {/* ── STEP 2 — Canvas Creator ─────────────────────────────────────── */}
          {step === "create" && (
            <>
              {/* ── Canvas area ── */}
              <div
                ref={previewRef}
                className="relative overflow-hidden select-none flex-shrink-0"
                style={{ height: "min(45vh, 340px)" }}
                onMouseMove={(e) => { if (draggingTextId) onTextDragMove(e); else if (draggingEmoji) onEmojiDragMove(e); else if (isDrawing) draw(e); }}
                onMouseUp={() => { onTextDragEnd(); onEmojiDragEnd(); endDraw(); }}
                onTouchMove={(e) => { if (draggingTextId) onTextDragMove(e); else if (draggingEmoji) onEmojiDragMove(e); else if (isDrawing) draw(e); }}
                onTouchEnd={() => { onTextDragEnd(); onEmojiDragEnd(); endDraw(); }}
              >
                {/* Media / background */}
                {hasMedia ? (
                  (mediaFileType === "video" || /\.(mp4|webm|mov|ogg)(\?|$)/i.test(mediaUrl))
                    ? <video src={mediaUrl} className="w-full h-full object-cover" style={filterStyle} playsInline muted controls />
                    : <img src={mediaUrl} alt="preview" className="w-full h-full object-cover" style={filterStyle} />
                ) : isTextOnly ? (
                  <div className={`w-full h-full bg-gradient-to-br ${selectedBg?.cls}`} />
                ) : (
                  /* Upload placeholder */
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer bg-black/60 hover:bg-black/50 transition relative">
                    <input type="file" className="hidden"
                      accept={contentType === "reel" ? "video/*" : "image/*,video/*"}
                      onChange={(e) => handleFileUpload(e.target.files?.[0])} />
                    {uploading ? (
                      <div className="flex flex-col items-center gap-4 px-10 w-full">
                        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                        <p className="text-gray-200 font-semibold">Uploading your media...</p>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-gray-400 text-sm">
                          {uploadProgress >= 95 ? "Finishing up..." : `${Math.round(uploadProgress)}%`}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
                          <Upload className="w-9 h-9 text-white" />
                        </div>
                        <p className="text-white font-bold text-lg mb-1">{contentType === "reel" ? "Upload Video" : "Upload Photo / Video"}</p>
                        <p className="text-gray-400 text-sm">{contentType === "reel" ? "MP4, MOV • Max 500MB" : "JPG, PNG, MP4, MOV • Max 500MB"}</p>
                        {contentType === "story" && (
                          <button
                            type="button"
                            onClick={(ev) => { ev.preventDefault(); addTextOverlay(); setActiveTool("text"); }}
                            className="mt-4 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white text-sm font-medium transition flex items-center gap-2"
                          >
                            <Type className="w-4 h-4" /> Text Story instead
                          </button>
                        )}
                      </>
                    )}
                  </label>
                )}

                {/* Draw canvas overlay */}
                {hasMedia && (
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: drawMode ? "auto" : "none", cursor: drawMode ? "crosshair" : "default" }}
                    onMouseDown={startDraw} onTouchStart={startDraw}
                  />
                )}

                {/* Emoji overlays — draggable */}
                {emojiOverlays.map((e) => (
                  <div key={e.id}
                    className="absolute group select-none"
                    style={{ left: e.x, top: e.y, fontSize: e.size, lineHeight: 1, cursor: "grab", touchAction: "none", zIndex: 10 }}
                    onMouseDown={(ev) => startEmojiDrag(ev, e.id)}
                    onTouchStart={(ev) => startEmojiDrag(ev, e.id)}
                  >
                    <span className="drop-shadow-lg">{e.emoji}</span>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); removeEmoji(e.id); }}
                      className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 rounded-full text-white text-xs items-center justify-center hidden group-hover:flex"
                    >×</button>
                  </div>
                ))}

                {/* Multiple text overlays — draggable */}
                {textOverlays.map((t) => (
                  t.text ? (
                    <div
                      key={t.id}
                      className="absolute cursor-grab active:cursor-grabbing select-none z-10"
                      style={{ left: t.x, top: t.y, touchAction: "none" }}
                      onMouseDown={(e) => startTextDrag(e, t.id)}
                      onTouchStart={(e) => startTextDrag(e, t.id)}
                      onDoubleClick={() => { setActiveTextId(t.id); setActiveTool("text"); }}
                    >
                      <p className="text-white text-xl font-bold text-center leading-relaxed drop-shadow-lg bg-black/40 rounded-2xl px-4 py-2 whitespace-nowrap max-w-xs"
                        style={{ color: t.color }}>
                        {t.text}
                      </p>
                    </div>
                  ) : null
                ))}

                {/* Trash zone — appears when dragging a text */}
                {showTrashZone && (
                  <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 px-6 py-3 rounded-2xl border-2 transition-all z-20 ${overTrash ? 'bg-red-500/80 border-red-400 scale-110' : 'bg-black/60 border-white/30'}`}>
                    <Trash2 className={`w-6 h-6 ${overTrash ? 'text-white' : 'text-gray-300'}`} />
                    <span className="text-white text-xs font-semibold">Drop to delete</span>
                  </div>
                )}

                {/* Caption preview at bottom */}
                {caption && hasMedia && !showTrashZone && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                    <p className="text-white text-sm font-medium line-clamp-2">{caption}</p>
                  </div>
                )}

                {/* Music badge */}
                {music && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur rounded-full px-3 py-1.5">
                    <Music className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                    <span className="text-white text-xs max-w-[120px] truncate font-medium">{music}</span>
                    <button onClick={() => setMusic("")} className="ml-1 text-gray-400 hover:text-white"><X className="w-3 h-3" /></button>
                  </div>
                )}

                {/* Location badge */}
                {location && (
                  <div className="absolute top-3 left-3 mt-8 flex items-center gap-1.5 bg-black/70 backdrop-blur rounded-full px-3 py-1.5" style={{ top: music ? 52 : 12 }}>
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-white text-xs font-medium">{location}</span>
                  </div>
                )}

                {/* Draw mode indicator */}
                {drawMode && (
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-purple-600/90 rounded-full px-4 py-2">
                    <Pen className="w-4 h-4 text-white" />
                    <span className="text-white text-xs font-semibold">Drawing mode — tap anywhere to draw</span>
                  </div>
                )}

                {/* ── Right-side floating tool rail — always visible ── */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
                  {visibleTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        const next = activeTool === tool.id ? null : tool.id;
                        setActiveTool(next);
                        if (next === "text" && textOverlays.length === 0) {
                          addTextOverlay();
                        }
                      }}
                      className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ${
                        activeTool === tool.id
                          ? "bg-white text-black scale-105"
                          : "bg-black/70 backdrop-blur-sm border border-white/20 text-white hover:bg-black/90"
                      }`}
                      title={tool.label}
                    >
                      <tool.icon className="w-5 h-5" />
                    </button>
                  ))}
                  {drawMode && (
                    <button
                      onClick={clearCanvas}
                      className="w-11 h-11 rounded-full bg-red-500/80 backdrop-blur flex items-center justify-center text-white text-xs font-bold shadow-lg"
                      title="Clear drawing"
                    >✕</button>
                  )}
                </div>
              </div>

              {/* ── Bottom tray — slides up per tool ── */}
              <AnimatePresence>
                {activeTool && (
                  <motion.div
                    key={activeTool}
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: "spring", damping: 30, stiffness: 350 }}
                    className="flex-shrink-0 bg-black/95 border-t border-white/10"
                  >
                    <div className="p-4">

                      {/* Emoji picker */}
                      {activeTool === "emoji" && (
                        <div>
                          <p className="text-gray-400 text-xs mb-3">Tap to add • Drag on canvas to reposition</p>
                          <div className="grid grid-cols-10 gap-1.5">
                            {POPULAR_EMOJIS.map((emoji) => (
                              <button key={emoji} onClick={() => addEmoji(emoji)}
                                className="h-9 text-xl flex items-center justify-center hover:bg-white/10 rounded-lg transition active:scale-90">
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Text */}
                      {activeTool === "text" && (
                        <div className="space-y-3">
                          {/* List of text overlays */}
                          {textOverlays.map((t) => (
                            <div key={t.id} className={`flex items-center gap-2 rounded-xl border p-1 ${activeTextId === t.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5'}`}>
                              <input
                                autoFocus={activeTextId === t.id}
                                value={t.text}
                                onChange={(e) => updateTextOverlay(t.id, 'text', e.target.value)}
                                onFocus={() => setActiveTextId(t.id)}
                                placeholder="Type something..."
                                className="flex-1 bg-transparent text-white text-sm px-3 py-2 placeholder-gray-500 focus:outline-none"
                                maxLength={120}
                              />
                              {/* Color dots */}
                              {["#ffffff","#ffdd00","#ff3388","#00bbff","#00ff88"].map(c => (
                                <button key={c} onClick={() => updateTextOverlay(t.id, 'color', c)}
                                  className={`w-5 h-5 rounded-full flex-shrink-0 transition-all ${t.color === c ? 'ring-2 ring-white scale-110' : ''}`}
                                  style={{ background: c }} />
                              ))}
                              <button onClick={() => removeTextOverlay(t.id)} className="p-1 hover:bg-red-500/20 rounded">
                                <X className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          ))}

                          {/* Add new text button */}
                          <button
                            onClick={addTextOverlay}
                            className="w-full py-2 border border-dashed border-white/20 rounded-xl text-gray-400 text-sm hover:border-purple-500/50 hover:text-white transition flex items-center justify-center gap-2"
                          >
                            <PlusIcon className="w-4 h-4" /> Add text
                          </button>

                          <p className="text-gray-600 text-xs text-center">Drag text on canvas • Double-tap to edit • Drag to 🗑 to delete</p>

                          {contentType === "story" && !hasMedia && (
                            <div className="flex gap-2">
                              {BG_GRADIENTS.map(bg => (
                                <button key={bg.id} onClick={() => setTextBg(bg.id)}
                                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${bg.cls} text-sm flex items-center justify-center transition-all ${textBg === bg.id ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"}`}
                                >{bg.label}</button>
                              ))}
                            </div>
                          )}
                          <div>
                            <p className="text-gray-400 text-xs mb-2">Caption</p>
                            <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                              placeholder="Write a caption..."
                              className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-3 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                              rows={2} maxLength={300} />
                          </div>
                        </div>
                      )}

                      {/* Draw */}
                      {activeTool === "draw" && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <button onClick={() => setDrawMode(!drawMode)}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${drawMode ? "bg-purple-600 text-white" : "bg-white/10 text-gray-200 hover:bg-white/20"}`}>
                              {drawMode ? "✏️ Drawing ON" : "Start Drawing"}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            {DRAW_COLORS.map(c => (
                              <button key={c} onClick={() => setDrawColor(c)}
                                className={`w-9 h-9 rounded-full transition-all ${drawColor === c ? "ring-2 ring-white scale-110" : "hover:scale-105"}`}
                                style={{ background: c }} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Filter */}
                      {activeTool === "filter" && (
                        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                          {FILTERS.map(f => (
                            <button key={f.id} onClick={() => setSelectedFilter(f.id)}
                              className={`flex-shrink-0 flex flex-col items-center gap-1 transition ${selectedFilter === f.id ? "opacity-100" : "opacity-60 hover:opacity-90"}`}>
                              <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${selectedFilter === f.id ? "border-purple-500" : "border-transparent"}`}>
                                <img src={mediaUrl} className="w-full h-full object-cover" style={f.style} alt={f.label} />
                              </div>
                              <p className="text-white text-xs">{f.label}</p>
                              {selectedFilter === f.id && <Check className="w-3 h-3 text-purple-400" />}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Music */}
                      {activeTool === "music" && (
                        <div className="space-y-3">
                          {music ? (
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                              <Music className="w-5 h-5 text-pink-400" />
                              <p className="text-white text-sm flex-1 truncate">{music}</p>
                              <button onClick={() => { setMusic(""); setAudioName(""); }} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4 text-gray-400" /></button>
                            </div>
                          ) : (
                            <>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input autoFocus value={musicQuery} onChange={(e) => setMusicQuery(e.target.value)}
                                  placeholder="Search songs..." className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-500" />
                              </div>
                              {musicResults.length > 0 && (
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {musicResults.map((track, i) => (
                                    <button key={i} onClick={() => { setMusic(`${track.artist} - ${track.title}`); setMusicQuery(""); setActiveTool(null); }}
                                      className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition">
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
                                <div className="p-2.5 border border-dashed border-white/20 rounded-xl text-center hover:border-purple-500/40 transition">
                                  <p className="text-white text-xs font-medium">Upload audio file</p>
                                </div>
                              </label>
                            </>
                          )}
                        </div>
                      )}

                      {/* Tag */}
                      {activeTool === "tag" && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input autoFocus value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { setTaggedUsers(prev => [...prev, tagInput.trim()]); setTagInput(""); }}}
                                placeholder="@username, press Enter"
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-500" />
                            </div>
                            <button onClick={() => { if (tagInput.trim()) { setTaggedUsers(prev => [...prev, tagInput.trim()]); setTagInput(""); }}}
                              className="px-4 py-2 bg-purple-600 rounded-xl text-white text-sm font-semibold hover:bg-purple-700 transition">Add</button>
                          </div>
                          {taggedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {taggedUsers.map((u, i) => (
                                <span key={i} className="flex items-center gap-1 bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-full text-purple-300 text-xs">
                                  <AtSign className="w-3 h-3" />{u}
                                  <button onClick={() => setTaggedUsers(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 text-purple-400 hover:text-white"><X className="w-3 h-3" /></button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Location */}
                      {activeTool === "location" && (
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input autoFocus value={location} onChange={(e) => setLocation(e.target.value)}
                            placeholder="Add location" className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-500" />
                        </div>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* If no media yet and it's post/reel — show caption area at bottom */}
              {!hasMedia && !isTextOnly && activeTool === null && (
                <div className="flex-shrink-0 px-4 pt-2 pb-1 border-t border-white/10">
                  <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption..."
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-3 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                    rows={2} maxLength={300} />
                </div>
              )}

              {/* Vibe & experience for posts — compact row */}
              {contentType === "post" && hasMedia && activeTool === null && (
                <div className="flex-shrink-0 px-4 py-2 border-t border-white/10 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  <span className="text-gray-500 text-xs flex-shrink-0">Vibe:</span>
                  {VIBES.map(v => (
                    <button key={v} onClick={() => setVibe(prev => prev === v ? "" : v)}
                      className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition ${vibe === v ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}
                    >{v}</button>
                  ))}
                </div>
              )}

              {/* ── Publish Button ── */}
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
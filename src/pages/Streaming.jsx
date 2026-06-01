import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import PageWrapper from "@/components/PageWrapper";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Play, Tv, Gamepad2, Music, Radio,
  TrendingUp, Users, Sparkles, Film, SlidersHorizontal,
  Upload, Clock, Calendar, DollarSign, X, Search, ChevronRight,
   Star, Eye, Zap, Camera, StopCircle, RotateCcw, Video, Loader2, UserCheck,
   Heart, Bookmark, Share2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import PaymentConfirmation from "../components/payment/PaymentConfirmation";
import StreamScheduler from "../components/livestream/StreamScheduler";
import WatchPartyModal from "../components/livestream/WatchPartyModal";
import TMDBMovieBrowser from "../components/streaming/TMDBMovieBrowser";
import GoLiveNowModal from "../components/livestream/GoLiveNowModal";
import ContentUploadModal from "../components/streaming/ContentUploadModal";
import PostStreamEditor from "../components/livestream/PostStreamEditor";
import StreamingActionPanel from "../components/streaming/StreamingActionPanel";
import StreamingContentRail from "../components/streaming/StreamingContentRail";
import StreamingTips from "../components/streaming/StreamingTips";
import { toggleStreamingEngagement } from "@/functions/toggleStreamingEngagement";

const CATEGORIES = [
  { id: "all", label: "All", icon: Tv },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "sports", label: "Sports", icon: TrendingUp },
  { id: "entertainment", label: "Shows", icon: Play },
  { id: "music", label: "Music", icon: Music },
  { id: "movies", label: "Movies", icon: Film },
];

const SORT_OPTIONS = [
  { value: "popularity", label: "Most Popular" },
  { value: "release_date", label: "Newest" },
  { value: "rating", label: "Highest Rated" },
  { value: "title", label: "Title A-Z" },
];

export default function Streaming() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "following"
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("popularity");
  const [genreFilter, setGenreFilter] = useState("all");

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [showContentUpload, setShowContentUpload] = useState(false);
  const [showGoLive, setShowGoLive] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showTMDBBrowser, setShowTMDBBrowser] = useState(false);
  const [showWatchParty, setShowWatchParty] = useState(null);
  const [editingStream, setEditingStream] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseType, setPurchaseType] = useState("buy");
  const [processing, setProcessing] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [confirmedPurchase, setConfirmedPurchase] = useState(null);

  // Upload state
  const [uploadData, setUploadData] = useState({
    title: "", type: "movie", category: "entertainment", description: "",
    thumbnail_url: "", video_url: "", duration: "", rating: "", tags: [],
    requires_subscription: false, is_monetized: false, price_usd: 0, rental_price_usd: 0,
  });
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);

  // Camera recording
  const [uploadMode, setUploadMode] = useState("file"); // "file" | "camera"
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const cameraPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (cameraPreviewRef.current) {
        cameraPreviewRef.current.srcObject = stream;
        cameraPreviewRef.current.play();
      }
    } catch (e) {
      toast.error("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeTypes = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4", ""];
    const mimeType = mimeTypes.find(m => m === "" || MediaRecorder.isTypeSupported(m)) ?? "";
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {});
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      setRecordedVideoUrl(URL.createObjectURL(blob));
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const discardRecording = useCallback(() => {
    setRecordedBlob(null);
    setRecordedVideoUrl(null);
    startCamera();
  }, [startCamera]);

  const uploadRecording = useCallback(async () => {
    if (!recordedBlob) return;
    setUploading(true);
    try {
      const file = new File([recordedBlob], `recording_${Date.now()}.webm`, { type: "video/webm" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadData(p => ({ ...p, video_url: file_url }));
      toast.success("Recording uploaded! Fill in the details and publish.");
      stopCamera();
      setUploadMode("file");
    } catch (e) {
      toast.error("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  }, [recordedBlob, stopCamera]);

  // Manage camera stream when switching modes
  useEffect(() => {
    if (showUpload && uploadMode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showUpload, uploadMode, startCamera, stopCamera]);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: content = [], isLoading, refetch: refetchContent } = useQuery({
    queryKey: ['streaming-content'],
    queryFn: () => base44.entities.StreamingContent.filter({ status: "published" }),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: activeLivestreams = [], refetch: refetchLive } = useQuery({
    queryKey: ['active-livestreams'],
    queryFn: async () => {
      const streams = await base44.entities.StreamingContent.filter({ is_live: true, status: "live" });
      // Only show streams that started within the last 8 hours (stale guard)
      const cutoff = Date.now() - 8 * 60 * 60 * 1000;
      return streams.filter(s => {
        if (!s.stream_started_at) return true;
        return new Date(s.stream_started_at).getTime() > cutoff;
      });
    },
    initialData: [],
    refetchInterval: 15000,
  });

  // Fetch who the current user is following
  const { data: following = [] } = useQuery({
    queryKey: ['streaming-following', currentUser?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: currentUser.email }),
    enabled: !!currentUser,
    initialData: [],
  });

  const followingEmails = useMemo(() => following.map(f => f.following_email), [following]);

  const followingContent = useMemo(() => {
    if (!followingEmails.length) return [];
    return content.filter(i =>
      !i.is_live &&
      i.status !== "ended" &&
      (followingEmails.includes(i.creator_email) || followingEmails.includes(i.created_by))
    ).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [content, followingEmails]);

  const followingLivestreams = useMemo(() => {
    if (!followingEmails.length) return [];
    return activeLivestreams.filter(i =>
      followingEmails.includes(i.creator_email) || followingEmails.includes(i.created_by)
    );
  }, [activeLivestreams, followingEmails]);

  const { data: endedStreams = [], refetch: refetchEnded } = useQuery({
    queryKey: ['ended-streams'],
    queryFn: () => base44.entities.StreamingContent.filter({ is_live: false, type: "live_event", status: "ended" }),
    enabled: !!currentUser,
    initialData: [],
  });

  const saveToChannelMutation = async (streamId) => {
    await base44.entities.StreamingContent.update(streamId, {
      content_type: "vod_from_live",
      status: "published",
      visibility: "public",
    });
    toast.success("Saved to channel!");
    refetchEnded();
  };

  const filteredContent = useMemo(() => {
    let list = content.filter(i => !i.is_live && i.status !== "ended");

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.tags?.some(t => t.toLowerCase().includes(q)) ||
        i.creator_username?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== "all") {
      if (selectedCategory === "movies") list = list.filter(i => i.type === "movie");
      else list = list.filter(i => i.category === selectedCategory);
    }

    if (availabilityFilter === "free") list = list.filter(i => !i.requires_subscription && !i.is_monetized);
    else if (availabilityFilter === "subscription") list = list.filter(i => i.requires_subscription);

    if (ratingFilter) list = list.filter(i => parseFloat(i.rating) >= parseFloat(ratingFilter));

    if (genreFilter !== "all") {
      const q = genreFilter.toLowerCase();
      list = list.filter(i => i.tags?.some(t => t.toLowerCase() === q));
    }

    return [...list].sort((a, b) => {
      if (sortBy === "popularity") return (b.views || 0) - (a.views || 0);
      if (sortBy === "release_date") return new Date(b.created_date) - new Date(a.created_date);
      if (sortBy === "rating") return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
      if (sortBy === "title") return a.title?.localeCompare(b.title);
      return 0;
    });
  }, [content, searchQuery, selectedCategory, availabilityFilter, ratingFilter, sortBy, genreFilter]);

  const trendingContent = useMemo(() =>
    [...content].filter(i => !i.is_live).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8),
    [content]
  );

  const newReleases = useMemo(() =>
    [...content]
      .filter(i => !i.is_live && i.status !== "ended")
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 10),
    [content]
  );

  const forYouContent = useMemo(() => {
    const baseList = followingContent.length > 0 ? followingContent : content.filter(i => !i.is_live && i.status !== "ended");
    return [...baseList]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10);
  }, [content, followingContent]);

  const requireLogin = () => {
    if (currentUser) return true;
    base44.auth.redirectToLogin();
    return false;
  };

  const handleEngagement = async (item, action) => {
    if (!requireLogin()) return;
    await toggleStreamingEngagement({ contentId: item.id, action });
    refetchContent();
    if (action === "like") toast.success(item.liked_by?.includes(currentUser.email) ? "Removed like" : "Liked");
    if (action === "watch_later") toast.success(item.saved_by?.includes(currentUser.email) ? "Removed from Watch Later" : "Saved to Watch Later");
  };

  const handleShare = async (item) => {
    const url = `${window.location.origin}${createPageUrl("LivestreamViewer")}?id=${item.id}`;
    const text = `Watch ${item.title} on Streaming`;

    if (navigator.share) {
      await navigator.share({ title: item.title, text, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied");
    }

    if (currentUser) {
      await toggleStreamingEngagement({ contentId: item.id, action: "share" });
      refetchContent();
    }
  };

  const handleUpload = async () => {
    if (!currentUser) { toast.error("Please log in to upload"); return; }
    if (!uploadData.title || !uploadData.video_url) { toast.error("Title and video URL required"); return; }
    setUploading(true);
    try {
      await base44.entities.StreamingContent.create({
        ...uploadData,
        creator_email: currentUser.email,
        creator_username: currentUser.username || currentUser.full_name,
        rating: parseFloat(uploadData.rating) || 0,
        price_usd: parseFloat(uploadData.price_usd) || 0,
        rental_price_usd: parseFloat(uploadData.rental_price_usd) || 0,
        is_live: false, status: "published"
      });
      toast.success("Content uploaded!");
      setShowUpload(false);
    } catch (e) { toast.error("Upload failed: " + e.message); }
    finally { setUploading(false); }
  };

  const handlePurchase = async () => {
    if (!currentUser || !selectedContent) return;
    setProcessing(true);
    try {
      const price = purchaseType === "rent" ? selectedContent.rental_price_usd : selectedContent.price_usd;
      if ((currentUser.balance_usd || 0) < price) { toast.error("Insufficient balance"); setProcessing(false); return; }
      await base44.auth.updateMe({ balance_usd: (currentUser.balance_usd || 0) - price });
      const creatorEarnings = price * 0.85;
      const creators = await base44.entities.User.filter({ email: selectedContent.creator_email });
      if (creators[0]) await base44.asServiceRole.entities.User.update(creators[0].id, { balance_usd: (creators[0].balance_usd || 0) + creatorEarnings });
      const expiresAt = purchaseType === "rent" ? new Date(Date.now() + 48 * 3600000).toISOString() : null;
      await base44.entities.ContentPurchase.create({
        content_id: selectedContent.id, buyer_email: currentUser.email,
        creator_email: selectedContent.creator_email, amount_usd: price,
        purchase_type: purchaseType, payment_method: "wallet", access_expires_at: expiresAt,
        platform_fee: price * 0.15, creator_earnings: creatorEarnings
      });
      await base44.entities.Payment.create({
        amount_usd: price, amount_rri: 0, method: "wallet", status: "completed",
        reference_type: "other", sender_email: currentUser.email,
        recipient_email: selectedContent.creator_email,
        memo: `${purchaseType === "rent" ? "Rental" : "Purchase"}: ${selectedContent.title}`
      });
      await base44.entities.Notification.create({
        recipient_email: selectedContent.creator_email, type: "payment_received",
        title: "Content Purchase",
        message: `${currentUser.full_name || currentUser.email} ${purchaseType === "rent" ? "rented" : "purchased"} "${selectedContent.title}" for $${price.toFixed(2)}`,
        sender_email: currentUser.email, read: false
      });
      setConfirmedPurchase({ amount: price, title: selectedContent.title });
      setShowPaymentConfirmation(true);
      setShowPurchaseModal(false);
    } catch (e) { toast.error("Purchase failed: " + e.message); }
    finally { setProcessing(false); }
  };

  const handleContentClick = async (item) => {
    if (item.is_monetized) {
      const purchases = await base44.entities.ContentPurchase.filter({ content_id: item.id, buyer_email: currentUser?.email }).catch(() => []);
      const hasPurchase = purchases.some(p => p.purchase_type === "buy" || (p.purchase_type === "rent" && new Date(p.access_expires_at) > new Date()));
      const isOwner = currentUser?.email === item.creator_email || currentUser?.email === item.created_by;
      if (!hasPurchase && !isOwner) { setSelectedContent(item); setShowPurchaseModal(true); return; }
    }
    navigate(createPageUrl("LivestreamViewer") + `?id=${item.id}`);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); setUploadData(p => ({ ...p, thumbnail_url: file_url })); toast.success("Thumbnail uploaded!"); }
    catch { toast.error("Upload failed"); }
  };

  return (
    <PageWrapper showBack={false}>
    <div className="min-h-screen bg-[#0e0e10]">

      {/* Hero Header */}
      <div className="relative bg-gradient-to-b from-[#1a0533] to-[#0e0e10] px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Streaming</h1>
            <p className="text-gray-400 text-sm mt-0.5">Watch live, stream, discover</p>
          </div>
          {currentUser && (
            <Button
              onClick={() => setShowGoLive(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 px-4 h-10 rounded-xl"
            >
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Go Live
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search streams, movies, creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/8 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 transition"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${activeTab === "all" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
            style={{ background: activeTab === "all" ? undefined : 'rgba(255,255,255,0.06)' }}
          >
            All Content
          </button>
          {currentUser && (
            <button
              onClick={() => setActiveTab("following")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5 ${activeTab === "following" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              style={{ background: activeTab === "following" ? undefined : 'rgba(255,255,255,0.06)' }}
            >
              <UserCheck className="w-4 h-4" />
              Following
              {followingContent.length > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === "following" ? "bg-white/20" : "bg-blue-500/30 text-blue-300"}`}>
                  {followingContent.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <StreamingActionPanel
        currentUser={currentUser}
        onBrowse={() => { setActiveTab("all"); setSelectedCategory("all"); setSearchQuery(""); }}
        onGoLive={() => setShowGoLive(true)}
        onUpload={() => setShowUpload(true)}
        onSchedule={() => setShowScheduler(true)}
        onMovies={() => setShowContentUpload(true)}
        onDiscover={() => setShowTMDBBrowser(true)}
      />

      {/* Stats Row */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
            <p className="text-green-400 font-bold text-lg">{activeLivestreams.length || "0"}</p>
            <p className="text-gray-500 text-xs">Live Now</p>
          </div>
          <div className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
            <p className="text-purple-400 font-bold text-lg">{content.length || "0"}</p>
            <p className="text-gray-500 text-xs">Videos</p>
          </div>
          <div className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
            <p className="text-blue-400 font-bold text-lg">
              {content.reduce((acc, c) => acc + (c.views || 0), 0).toLocaleString() || "0"}
            </p>
            <p className="text-gray-500 text-xs">Total Views</p>
          </div>
        </div>
      </div>

      {activeTab === "all" && !searchQuery && (
        <StreamingContentRail
          title="For You"
          subtitle={followingContent.length > 0 ? "Fresh picks from creators you follow" : "Popular picks to help you start watching"}
          icon={Sparkles}
          items={forYouContent}
          currentUser={currentUser}
          onSelect={handleContentClick}
          onWatchParty={setShowWatchParty}
          onLike={(item) => handleEngagement(item, "like")}
          onWatchLater={(item) => handleEngagement(item, "watch_later")}
          onShare={handleShare}
        />
      )}

      {/* LIVE NOW */}
      {activeLivestreams.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-white font-bold text-lg">Live Now</h2>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{activeLivestreams.length}</Badge>
          </div>
          <div className="space-y-3">
            {activeLivestreams.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(createPageUrl("LivestreamViewer") + `?id=${item.id}`)}
                className="relative flex gap-3 bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="relative w-28 h-20 flex-shrink-0">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-900 to-purple-900 flex items-center justify-center">
                      <Radio className="w-6 h-6 text-white/40" />
                    </div>
                  )}
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-red-600 px-1.5 py-0.5 rounded text-white text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                </div>
                <div className="flex-1 py-3 pr-3 min-w-0">
                  <p className="text-white font-semibold text-sm line-clamp-1">{item.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5 truncate">@{item.creator_username || item.creator_email}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <Eye className="w-3 h-3" />
                      {item.views || 0}
                    </div>
                    <Badge className="bg-white/10 text-gray-300 text-[10px] border-0 capitalize">{item.category}</Badge>
                  </div>
                </div>
                <div className="flex items-center pr-3">
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Ended Streams - Save to Channel */}
      {endedStreams.filter(s => s.created_by === currentUser?.email || s.creator_email === currentUser?.email).length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-4 h-4 text-yellow-400" />
            <h2 className="text-white font-bold text-lg">Save to Channel</h2>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Ended</Badge>
          </div>
          <div className="space-y-2">
            {endedStreams
              .filter(s => s.created_by === currentUser?.email || s.creator_email === currentUser?.email)
              .map(s => (
                <div key={s.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="w-14 h-10 rounded-lg bg-gray-800 flex-shrink-0 overflow-hidden">
                    {s.thumbnail_url ? <img src={s.thumbnail_url} alt={s.title} className="w-full h-full object-cover" /> : <Video className="w-5 h-5 text-gray-600 m-auto mt-2.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium line-clamp-1">{s.title}</p>
                    <p className="text-gray-500 text-xs">Stream ended — edit & save as VOD</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 font-bold"
                      onClick={() => setEditingStream(s)}
                    >
                      ✂️ Edit & Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-gray-400 hover:text-white"
                      onClick={() => saveToChannelMutation(s.id)}
                    >
                      Quick Save
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Trending */}
      {trendingContent.length > 0 && !searchQuery && (
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              Trending
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2" style={{ touchAction: 'pan-x' }}>
            {trendingContent.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => handleContentClick(item)}
                className="flex-shrink-0 w-32 cursor-pointer group"
              >
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-900">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <Tv className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </div>
                  {item.is_monetized && (
                    <div className="absolute top-1.5 right-1.5 bg-green-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <DollarSign className="w-2.5 h-2.5" />
                      {item.rental_price_usd > 0 ? item.rental_price_usd : item.price_usd}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">{item.title}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "all" && !searchQuery && (
        <StreamingContentRail
          title="New Releases"
          subtitle="Recently published videos and shows"
          icon={Clock}
          items={newReleases}
          currentUser={currentUser}
          onSelect={handleContentClick}
          onWatchParty={setShowWatchParty}
          onLike={(item) => handleEngagement(item, "like")}
          onWatchLater={(item) => handleEngagement(item, "watch_later")}
          onShare={handleShare}
        />
      )}

      {/* Following Feed */}
      {activeTab === "following" && (
        <div className="px-4 mb-6">
          {!currentUser ? (
            <div className="text-center py-16">
              <UserCheck className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 font-semibold">Sign in to see your following feed</p>
            </div>
          ) : following.length === 0 ? (
            <div className="text-center py-16">
              <UserCheck className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 font-semibold">You're not following anyone yet</p>
              <p className="text-gray-600 text-sm mt-1">Follow creators to see their content here</p>
            </div>
          ) : (
            <>
              {/* Live from following */}
              {followingLivestreams.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <h2 className="text-white font-bold text-base">Live from Following</h2>
                  </div>
                  <div className="space-y-3">
                    {followingLivestreams.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => navigate(createPageUrl("LivestreamViewer") + `?id=${item.id}`)}
                        className="flex gap-3 bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                      >
                        <div className="relative w-28 h-20 flex-shrink-0">
                          {item.thumbnail_url ? (
                            <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-red-900 to-purple-900 flex items-center justify-center">
                              <Radio className="w-6 h-6 text-white/40" />
                            </div>
                          )}
                          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-red-600 px-1.5 py-0.5 rounded text-white text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                          </div>
                        </div>
                        <div className="flex-1 py-3 pr-3 min-w-0">
                          <p className="text-white font-semibold text-sm line-clamp-1">{item.title}</p>
                          <p className="text-gray-400 text-xs mt-0.5 truncate">@{item.creator_username || item.creator_email}</p>
                        </div>
                        <div className="flex items-center pr-3">
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VOD from following */}
              {followingContent.length === 0 ? (
                <div className="text-center py-10">
                  <Tv className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No videos from followed creators yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {followingContent.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => handleContentClick(item)}
                      className="cursor-pointer group"
                    >
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-900">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                            <Tv className="w-10 h-10 text-gray-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white font-semibold text-xs line-clamp-2 leading-tight mb-1">{item.title}</p>
                          <p className="text-gray-400 text-[10px] truncate">@{item.creator_username || item.creator_email}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "all" && currentUser && content.some(item => item.saved_by?.includes(currentUser.email)) && (
        <StreamingContentRail
          title="Watch Later"
          subtitle="Videos you saved for later"
          icon={Clock}
          items={content.filter(item => item.saved_by?.includes(currentUser.email))}
          currentUser={currentUser}
          onSelect={handleContentClick}
          onWatchParty={setShowWatchParty}
          onLike={(item) => handleEngagement(item, "like")}
          onWatchLater={(item) => handleEngagement(item, "watch_later")}
          onShare={handleShare}
        />
      )}

      {/* Category Tabs — only show in "all" tab */}
      {activeTab === "all" && <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ touchAction: 'pan-x' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition ${
                selectedCategory === cat.id
                  ? "bg-purple-600 text-white"
                  : "bg-white/8 text-gray-400 hover:bg-white/12"
              }`}
              style={{ background: selectedCategory === cat.id ? undefined : 'rgba(255,255,255,0.06)' }}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>}

      {/* Filter Toggle Row */}
      {activeTab === "all" && <div className="px-4 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            {filteredContent.length} {filteredContent.length === 1 ? "video" : "videos"}
            {searchQuery && <span className="text-purple-400"> for "{searchQuery}"</span>}
          </p>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 bg-white/5 border border-white/10 rounded-xl p-3 space-y-3"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Sort</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Genre</label>
                  <Select value={genreFilter} onValueChange={setGenreFilter}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genres</SelectItem>
                      <SelectItem value="action">Action</SelectItem>
                      <SelectItem value="comedy">Comedy</SelectItem>
                      <SelectItem value="drama">Drama</SelectItem>
                      <SelectItem value="horror">Horror</SelectItem>
                      <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                      <SelectItem value="romance">Romance</SelectItem>
                      <SelectItem value="documentary">Documentary</SelectItem>
                      <SelectItem value="thriller">Thriller</SelectItem>
                      <SelectItem value="animation">Animation</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Access</label>
                  <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="subscription">Sub</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Min Rating</label>
                  <Input
                    type="number" min="0" max="10" step="0.5" placeholder="0"
                    value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}
                    className="bg-white/10 border-white/20 text-white h-9 text-xs"
                  />
                </div>
              </div>
              <button
                onClick={() => { setSortBy("popularity"); setAvailabilityFilter("all"); setRatingFilter(""); setGenreFilter("all"); setSearchQuery(""); }}
                className="text-xs text-gray-500 hover:text-white transition"
              >
                Clear all filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>}

      {/* Content Grid — only in "all" tab */}

      {activeTab === "all" && <div className="px-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-16">
            <Tv className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold">No content found</p>
            <p className="text-gray-600 text-sm mt-1">Try a different category or search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <AnimatePresence>
              {filteredContent.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => handleContentClick(item)}
                  className="cursor-pointer group"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-900">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <Tv className="w-10 h-10 text-gray-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {item.is_monetized && (
                        <span className="bg-green-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <DollarSign className="w-2.5 h-2.5" />
                          {item.price_usd > 0 ? `$${item.price_usd}` : `$${item.rental_price_usd}/rent`}
                        </span>
                      )}
                    </div>

                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                      <button
                        className="bg-black/60 p-1.5 rounded-lg backdrop-blur text-white"
                        onClick={(e) => { e.stopPropagation(); handleEngagement(item, "like"); }}
                        title="Like"
                      >
                        <Heart className={`w-3 h-3 ${item.liked_by?.includes(currentUser?.email) ? "fill-red-500 text-red-500" : ""}`} />
                      </button>
                      <button
                        className="bg-black/60 p-1.5 rounded-lg backdrop-blur text-white"
                        onClick={(e) => { e.stopPropagation(); handleEngagement(item, "watch_later"); }}
                        title="Watch later"
                      >
                        <Bookmark className={`w-3 h-3 ${item.saved_by?.includes(currentUser?.email) ? "fill-blue-400 text-blue-400" : ""}`} />
                      </button>
                      <button
                        className="bg-black/60 p-1.5 rounded-lg backdrop-blur text-white"
                        onClick={(e) => { e.stopPropagation(); handleShare(item); }}
                        title="Share"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                      <button
                        className="bg-purple-600/80 p-1.5 rounded-lg backdrop-blur text-white"
                        onClick={(e) => { e.stopPropagation(); setShowWatchParty(item); }}
                        title="Watch party"
                      >
                        <Users className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-semibold text-xs line-clamp-2 leading-tight mb-1">{item.title}</p>
                      <div className="flex items-center gap-2 text-gray-400 text-[10px]">
                        {item.rating && (
                          <span className="flex items-center gap-0.5 text-yellow-400">
                            <Star className="w-2.5 h-2.5 fill-yellow-400" />{item.rating}
                          </span>
                        )}
                        {item.duration && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />{item.duration}
                          </span>
                        )}
                        {item.views > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Eye className="w-2.5 h-2.5" />{item.views.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>}

      <StreamingTips />

      {/* ── MODALS ── */}

      {/* Go Live */}
      {showGoLive && currentUser && (
        <GoLiveNowModal
          currentUser={currentUser}
          onClose={() => setShowGoLive(false)}
          onSuccess={() => { setShowGoLive(false); toast.success("Stream started!"); setTimeout(() => window.location.reload(), 1000); }}
        />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => { setShowUpload(false); stopCamera(); }}>
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#18181b] rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" /> Upload Content
              </h2>
              <button onClick={() => { setShowUpload(false); stopCamera(); }} className="p-1.5 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4 p-1 bg-white/5 rounded-xl">
              <button
                onClick={() => setUploadMode("file")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${uploadMode === "file" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                <Upload className="w-4 h-4" /> File / URL
              </button>
              <button
                onClick={() => setUploadMode("camera")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition ${uploadMode === "camera" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                <Camera className="w-4 h-4" /> Record Camera
              </button>
            </div>

            {/* Camera Recording UI */}
            {uploadMode === "camera" && (
              <div className="space-y-3 mb-4">
                {!recordedVideoUrl ? (
                  <>
                    <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                      <video ref={cameraPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                      {recording && (
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 px-2 py-1 rounded-full text-white text-xs font-bold">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> REC
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!recording ? (
                        <Button onClick={startRecording} className="flex-1 bg-red-600 hover:bg-red-700 font-bold">
                          <Camera className="w-4 h-4 mr-2" /> Start Recording
                        </Button>
                      ) : (
                        <Button onClick={stopRecording} className="flex-1 bg-white text-black hover:bg-gray-200 font-bold">
                          <StopCircle className="w-4 h-4 mr-2" /> Stop Recording
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                      <video src={recordedVideoUrl} controls className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">✓ Recorded</div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={discardRecording} variant="outline" className="flex-1 border-white/20 text-gray-300">
                        <RotateCcw className="w-4 h-4 mr-2" /> Re-record
                      </Button>
                      <Button onClick={uploadRecording} disabled={uploading} className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold">
                        {uploading ? "Uploading..." : <><Upload className="w-4 h-4 mr-2" /> Use This Video</>}
                      </Button>
                    </div>
                  </>
                )}
                <p className="text-gray-500 text-xs text-center">After recording, fill in the title and details below to publish</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Title *</label>
                <Input value={uploadData.title} onChange={(e) => setUploadData(p => ({ ...p, title: e.target.value }))} placeholder="Enter content title" className="bg-white/8 border-white/15 text-white" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Type</label>
                  <Select value={uploadData.type} onValueChange={(v) => setUploadData(p => ({ ...p, type: v }))}>
                    <SelectTrigger className="bg-white/8 border-white/15 text-white" style={{ background: 'rgba(255,255,255,0.06)' }}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="movie">Movie</SelectItem>
                      <SelectItem value="series">TV Series</SelectItem>
                      <SelectItem value="gaming_stream">Gaming</SelectItem>
                      <SelectItem value="live_event">Live Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Category</label>
                  <Select value={uploadData.category} onValueChange={(v) => setUploadData(p => ({ ...p, category: v }))}>
                    <SelectTrigger className="bg-white/8 border-white/15 text-white" style={{ background: 'rgba(255,255,255,0.06)' }}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Description</label>
                <Textarea value={uploadData.description} onChange={(e) => setUploadData(p => ({ ...p, description: e.target.value }))} placeholder="Describe your content..." className="bg-white/8 border-white/15 text-white" rows={3} style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Video *</label>
                <Input value={uploadData.video_url} onChange={(e) => setUploadData(p => ({ ...p, video_url: e.target.value }))} placeholder="Paste video URL (MP4, HLS, YouTube...)" className="bg-white/8 border-white/15 text-white" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="file"
                    accept="video/*,video/mp4,video/mov,video/avi,video/mkv,video/webm"
                    id="video-file-upload"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const maxGB = 10;
                      if (file.size > maxGB * 1024 * 1024 * 1024) {
                        toast.error(`File too large. Max ${maxGB}GB.`); return;
                      }
                      setUploading(true);
                      toast.info(`Uploading "${file.name}" in background — fill in details while it uploads!`);
                      try {
                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
                        setUploadData(p => ({ ...p, video_url: file_url }));
                        toast.success("Video upload complete!");
                      } catch (err) {
                        toast.error("Upload failed: " + err.message);
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-white/8 border-white/15 text-blue-400"
                    onClick={() => document.getElementById('video-file-upload').click()}
                    disabled={uploading}
                  >
                    {uploading ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Uploading...</> : <><Upload className="w-3.5 h-3.5 mr-1" />Upload File (up to 10GB)</>}
                  </Button>
                </div>
                {uploading && (
                  <p className="text-blue-400 text-xs mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading in background — you can fill in the details above
                  </p>
                )}
                {uploadData.video_url && !uploading && uploadData.video_url.startsWith("http") && (
                  <p className="text-green-400 text-xs mt-1">✓ Video ready</p>
                )}
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Thumbnail</label>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0])} className="hidden" id="thumb-upload" />
                <div className="flex items-center gap-3">
                  <Button type="button" onClick={() => document.getElementById('thumb-upload').click()} variant="outline" size="sm" className="bg-white/8 border-white/15">Choose Image</Button>
                  {uploadData.thumbnail_url && <img src={uploadData.thumbnail_url} className="h-10 w-16 object-cover rounded-lg" alt="thumb" />}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Tags</label>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter' && tagInput.trim()) { setUploadData(p => ({ ...p, tags: [...p.tags, tagInput.trim()] })); setTagInput(""); }}}
                    placeholder="Add tag + Enter" className="bg-white/8 border-white/15 text-white flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <Button type="button" size="sm" variant="outline" className="bg-white/8 border-white/15" onClick={() => { if (tagInput.trim()) { setUploadData(p => ({ ...p, tags: [...p.tags, tagInput.trim()] })); setTagInput(""); }}}>+</Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {uploadData.tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 bg-purple-500/20 border border-purple-500/30 px-2 py-1 rounded-full text-purple-300 text-xs">
                      #{tag}
                      <button onClick={() => setUploadData(p => ({ ...p, tags: p.tags.filter((_, j) => j !== i) }))} className="text-purple-400 hover:text-white">×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Monetization */}
              <div className="border-t border-white/10 pt-4">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={uploadData.is_monetized} onChange={(e) => setUploadData(p => ({ ...p, is_monetized: e.target.checked }))} className="w-4 h-4 accent-purple-500" />
                  <span className="text-white text-sm font-medium">Enable Monetization</span>
                </label>
                {uploadData.is_monetized && (
                  <div className="grid grid-cols-2 gap-3 pl-6">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Buy Price ($)</label>
                      <Input type="number" min="0" step="0.01" value={uploadData.price_usd} onChange={(e) => setUploadData(p => ({ ...p, price_usd: e.target.value }))} className="bg-white/8 border-white/15 text-white" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Rent Price ($)</label>
                      <Input type="number" min="0" step="0.01" value={uploadData.rental_price_usd} onChange={(e) => setUploadData(p => ({ ...p, rental_price_usd: e.target.value }))} className="bg-white/8 border-white/15 text-white" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                    <div className="col-span-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-blue-300 text-xs">You earn 85% of each sale — platform takes 15%</div>
                  </div>
                )}
              </div>

              <Button onClick={handleUpload} disabled={uploading} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-11 font-bold">
                {uploading ? "Uploading..." : "Publish Content"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && selectedContent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowPurchaseModal(false)}>
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#18181b] rounded-t-3xl sm:rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">Get Access</h2>
              <button onClick={() => setShowPurchaseModal(false)} className="p-1.5 hover:bg-white/10 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="flex gap-3 mb-5 bg-white/5 rounded-xl p-3">
              {selectedContent.thumbnail_url && <img src={selectedContent.thumbnail_url} className="w-16 h-24 rounded-lg object-cover flex-shrink-0" alt="" />}
              <div>
                <p className="text-white font-bold">{selectedContent.title}</p>
                {selectedContent.duration && <p className="text-gray-400 text-sm mt-0.5">{selectedContent.duration}</p>}
                {selectedContent.rating && <p className="text-yellow-400 text-sm flex items-center gap-1 mt-1"><Star className="w-3.5 h-3.5 fill-yellow-400" />{selectedContent.rating}</p>}
              </div>
            </div>

            <div className="space-y-2 mb-5">
              {selectedContent.price_usd > 0 && (
                <button onClick={() => setPurchaseType("buy")} className={`w-full p-4 rounded-xl border-2 transition text-left flex items-center justify-between ${purchaseType === "buy" ? "border-green-500 bg-green-500/15" : "border-white/10 bg-white/5"}`}>
                  <div><p className="text-white font-bold">Buy</p><p className="text-gray-400 text-xs">Permanent access</p></div>
                  <p className="text-green-400 font-bold text-xl">${selectedContent.price_usd}</p>
                </button>
              )}
              {selectedContent.rental_price_usd > 0 && (
                <button onClick={() => setPurchaseType("rent")} className={`w-full p-4 rounded-xl border-2 transition text-left flex items-center justify-between ${purchaseType === "rent" ? "border-blue-500 bg-blue-500/15" : "border-white/10 bg-white/5"}`}>
                  <div><p className="text-white font-bold">Rent</p><p className="text-gray-400 text-xs">48-hour access</p></div>
                  <p className="text-blue-400 font-bold text-xl">${selectedContent.rental_price_usd}</p>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-400 mb-4 bg-white/5 rounded-xl p-3">
              <span>Your balance</span>
              <span className="text-white font-bold">${(currentUser?.balance_usd || 0).toFixed(2)}</span>
            </div>

            <Button onClick={handlePurchase} disabled={processing} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 h-12 font-bold">
              {processing ? "Processing..." : `Confirm ${purchaseType === "rent" ? "Rental" : "Purchase"}`}
            </Button>
            <Button onClick={() => navigate(createPageUrl("Wallet"))} variant="ghost" className="w-full mt-2 text-gray-400 hover:text-white">
              Add funds to wallet
            </Button>
          </motion.div>
        </div>
      )}

      {/* Other modals */}
      {showPaymentConfirmation && confirmedPurchase && (
        <PaymentConfirmation amount={confirmedPurchase.amount} currency="USD" type="purchase"
          onClose={() => { setShowPaymentConfirmation(false); setConfirmedPurchase(null); window.location.reload(); }} />
      )}
      {showScheduler && <StreamScheduler currentUser={currentUser} onClose={() => setShowScheduler(false)} />}
      {showWatchParty && <WatchPartyModal content={showWatchParty} currentUser={currentUser} onClose={() => setShowWatchParty(null)} />}
      {showTMDBBrowser && <TMDBMovieBrowser onClose={() => setShowTMDBBrowser(false)} />}

      {/* TV & Movies Upload Modal */}
      {showContentUpload && (
        <ContentUploadModal currentUser={currentUser} onClose={() => setShowContentUpload(false)} />
      )}

      {/* Post-Stream Editor (trim + highlights + VOD save) */}
      {editingStream && (
        <PostStreamEditor
          stream={editingStream}
          onClose={() => setEditingStream(null)}
          onSaved={() => { setEditingStream(null); refetchEnded(); }}
        />
      )}
    </div>
    </PageWrapper>
  );
}
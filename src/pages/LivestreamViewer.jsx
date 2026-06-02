import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Users, Video, Share2, UserPlus, Maximize2, Minimize2,
  Heart, MessageCircle, BarChart3, HelpCircle, ShoppingCart, StopCircle,
  Radio, Gift, Settings, Crown, Send, Scissors
} from "lucide-react";
import LivestreamChat from "../components/livestream/LivestreamChat.jsx";
import LivestreamReactions from "../components/livestream/LivestreamReactions.jsx";
import LivestreamPolls from "../components/livestream/LivestreamPolls.jsx";
import LivestreamQA from "../components/livestream/LivestreamQA.jsx";
import AgoraVideoPlayer from "../components/livestream/AgoraVideoPlayer.jsx";
import CoHostManager from "../components/livestream/CoHostManager.jsx";
import ClipCreator from "../components/livestream/ClipCreator.jsx";
import ReactionEffects from "../components/livestream/ReactionEffects.jsx";
import PPVTicketGate from "../components/livestream/PPVTicketGate.jsx";
import LiveTippingOverlay from "../components/livestream/LiveTippingOverlay.jsx";
import ProductShowcase from "../components/livestream/ProductShowcase.jsx";
import JoinRequestButton from "../components/livestream/JoinRequestButton.jsx";
import JoinRequestsPanel from "../components/livestream/JoinRequestsPanel.jsx";
import SubscribeButton from "../components/creator/SubscribeButton.jsx";
import LiveTipFeed from "../components/livestream/LiveTipFeed.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const TABS = [
  { id: 'chat',  label: 'Chat',  icon: MessageCircle, color: 'purple' },
  { id: 'polls', label: 'Polls', icon: BarChart3,      color: 'blue' },
  { id: 'qa',    label: 'Q&A',   icon: HelpCircle,    color: 'green' },
  { id: 'shop',  label: 'Shop',  icon: ShoppingCart,  color: 'amber' },
  { id: 'tips',  label: 'Tips',  icon: Gift,           color: 'yellow' },
];

export default function LivestreamViewer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [streamId, setStreamId] = useState(null);
  const [isBroadcaster, setIsBroadcaster] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const [showClipCreator, setShowClipCreator] = useState(false);
  const [isStreamPaused, setIsStreamPaused] = useState(false);

  // Init
  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const broadcaster = params.get('broadcaster') === 'true';
    setStreamId(id);
    setIsBroadcaster(broadcaster);

    if (id) {
      base44.entities.ViewerAnalytics.create({ content_id: id, is_currently_watching: true }).catch(() => {});
      return () => {
        base44.auth.me().then(user => {
          base44.entities.ViewerAnalytics.filter({ content_id: id, created_by: user?.email })
            .then(analytics => {
              if (analytics[0]) base44.entities.ViewerAnalytics.update(analytics[0].id, { is_currently_watching: false }).catch(() => {});
            }).catch(() => {});
        }).catch(() => {});
      };
    }
  }, []);

  const { data: stream } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: async () => {
      const streams = await base44.entities.StreamingContent.filter({ id: streamId });
      if (!streams[0]) return null;
      try {
        const users = await base44.entities.User.filter({ email: streams[0].created_by });
        return { ...streams[0], creator_username: users[0]?.username || streams[0].created_by };
      } catch { return streams[0]; }
    },
    enabled: !!streamId,
    refetchInterval: 10000
  });

  const { data: streamTiers = [] } = useQuery({
    queryKey: ['stream-tiers', streamId],
    queryFn: () => base44.entities.LivestreamPricingTier.filter({ stream_id: streamId }),
    enabled: !!streamId
  });

  // Real-time viewer count
  useEffect(() => {
    if (!streamId) return;
    const updateCount = async () => {
      try {
        const analytics = await base44.entities.ViewerAnalytics.filter({ content_id: streamId, is_currently_watching: true });
        setViewerCount(analytics.length);
      } catch {}
    };
    updateCount();
    const unsub = base44.entities.ViewerAnalytics.subscribe((event) => {
      if (event.data?.content_id === streamId) updateCount();
    });
    return () => unsub();
  }, [streamId]);

  // Follow status
  useEffect(() => {
    if (!currentUser || !stream) return;
    base44.entities.Follow.filter({ follower_email: currentUser.email, following_email: stream.created_by })
      .then(f => setIsFollowing(f.length > 0)).catch(() => {});
  }, [currentUser, stream]);

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const f = await base44.entities.Follow.filter({ follower_email: currentUser.email, following_email: stream.created_by });
        if (f[0]) await base44.entities.Follow.delete(f[0].id);
      } else {
        await base44.entities.Follow.create({ follower_email: currentUser.email, following_email: stream.created_by });
      }
    },
    onSuccess: () => { setIsFollowing(v => !v); toast.success(isFollowing ? 'Unfollowed' : 'Now following!'); }
  });

  const endStreamMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.StreamingContent.update(streamId, {
        is_live: false,
        status: "ended",
        content_type: "vod_from_live",
        stream_ended_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Stream ended! You can save it to your channel from the Streaming page.');
      navigate(-1);
    }
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: stream?.title, url }); } catch {}
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
    }
  };

  const sendReaction = useCallback(() => {
    if (!currentUser) return;
    base44.entities.LivestreamReaction.create({ stream_id: streamId, reaction_type: 'heart', user_email: currentUser.email }).catch(() => {});
  }, [streamId, currentUser]);

  const isStreamCreator = currentUser?.email === stream?.created_by;

  if (!stream) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading stream...</p>
        </div>
      </div>
    );
  }

  const tabColorMap = { purple: 'bg-purple-500', blue: 'bg-blue-500', green: 'bg-green-500', amber: 'bg-amber-500', yellow: 'bg-yellow-500' };

  const content = (
    <div className="min-h-screen bg-black">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/95 to-black/60 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          {/* Left */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition flex-shrink-0">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {(stream.creator_username || stream.created_by)?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm truncate">{stream.title}</p>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs truncate">@{stream.creator_username || stream.created_by}</span>
                  {stream.is_live && !isStreamPaused && (
                    <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded-full text-white text-xs font-bold">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      LIVE
                    </span>
                  )}
                  {isStreamPaused && (
                    <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-yellow-500 rounded-full text-white text-xs font-bold">
                      ⏸ PAUSED
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center viewers */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full flex-shrink-0">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-white text-sm font-bold">{viewerCount.toLocaleString()}</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isStreamCreator && currentUser && (
              <>
                <Button
                  onClick={() => followMutation.mutate()}
                  size="sm"
                  className={isFollowing ? "bg-white/10 border border-white/20 text-white text-xs h-8" : "bg-purple-600 hover:bg-purple-700 text-xs h-8"}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <SubscribeButton
                  creatorEmail={stream?.created_by}
                  creatorName={stream?.creator_username || stream?.created_by}
                  currentUser={currentUser}
                  compact
                />
              </>
            )}
            <button
              onClick={() => setShowClipCreator(true)}
              title="Create Clip"
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <Scissors className="w-4 h-4 text-white" />
            </button>
            <button onClick={handleShare} className="p-2 hover:bg-white/10 rounded-full transition">
              <Share2 className="w-4 h-4 text-white" />
            </button>
            {isStreamCreator && (
              <button onClick={() => setShowHostPanel(v => !v)} className="p-2 hover:bg-white/10 rounded-full transition">
                <Settings className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="pt-[60px] h-screen flex flex-col lg:flex-row">

        {/* === MOBILE LAYOUT — Full screen with overlay chat (Instagram/Twitch style) === */}
        <div className="relative flex-1 bg-black lg:hidden" style={{ height: 'calc(100vh - 60px)' }}>
          {stream.is_live && stream.agora_channel_name ? (
            <>
              <AgoraVideoPlayer
                channelName={stream.agora_channel_name}
                role={isBroadcaster ? "host" : "audience"}
                onViewerJoin={() => {}}
                onPauseChange={setIsStreamPaused}
              />
              <ReactionEffects streamId={streamId} />

              {/* Floating chat overlay — bottom-left, like Instagram/Twitch */}
              <MobileOverlayChat
                streamId={streamId}
                isCreator={isStreamCreator}
                currentUser={currentUser}
              />

              {/* Right side action buttons */}
              <div className="absolute right-3 bottom-20 flex flex-col gap-3 z-20">
                <motion.button whileTap={{ scale: 0.85 }} onClick={sendReaction}
                  className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                  <Heart className="w-5 h-5 text-white" />
                </motion.button>
                {!isStreamCreator && currentUser && (
                  <JoinRequestButton streamId={streamId} currentUser={currentUser} isCreator={false} />
                )}
              </div>

              {isStreamCreator && (
                <div className="absolute top-3 right-3 z-20">
                  <Button
                    onClick={() => { if (confirm('End this livestream?')) endStreamMutation.mutate(); }}
                    size="sm"
                    className="bg-red-600/80 hover:bg-red-600 backdrop-blur-sm border border-red-500/50 text-xs"
                  >
                    <StopCircle className="w-3.5 h-3.5 mr-1" />
                    End Stream
                  </Button>
                </div>
              )}
            </>
          ) : stream.video_url ? (
            /* VOD playback — uploaded video */
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
              <video
                src={stream.video_url}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
                style={{ maxHeight: '100%' }}
                onPlay={() => base44.entities.StreamingContent.update(streamId, { views: (stream.views || 0) + 1 }).catch(() => {})}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-6">
                <Video className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white font-bold mb-1">
                  {stream.status === 'ended' ? 'Stream Ended — No Recording Available' : 'Video Not Available'}
                </p>
                <Button onClick={() => navigate(-1)} size="sm" className="bg-purple-600 hover:bg-purple-700 mt-2">Back</Button>
              </div>
            </div>
          )}
        </div>

        {/* === DESKTOP LAYOUT === */}
        <div className={`hidden lg:block relative bg-black ${isTheaterMode ? 'flex-1' : 'flex-1'}`}>
          {stream.is_live && stream.agora_channel_name ? (
            <>
              <AgoraVideoPlayer
                channelName={stream.agora_channel_name}
                role={isBroadcaster ? "host" : "audience"}
                onViewerJoin={() => {}}
                onPauseChange={setIsStreamPaused}
              />
              <ReactionEffects streamId={streamId} />
              <button
                onClick={() => setIsTheaterMode(v => !v)}
                className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full transition z-10"
              >
                {isTheaterMode ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
              </button>
              {isStreamCreator && (
                <div className="absolute bottom-4 left-4 z-10">
                  <Button
                    onClick={() => { if (confirm('End this livestream?')) endStreamMutation.mutate(); }}
                    size="sm"
                    className="bg-red-600/80 hover:bg-red-600 backdrop-blur-sm border border-red-500/50"
                  >
                    <StopCircle className="w-4 h-4 mr-1" />
                    End Stream
                  </Button>
                </div>
              )}
            </>
          ) : stream.video_url ? (
            /* VOD playback — uploaded video */
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <video
                src={stream.video_url}
                controls
                autoPlay
                className="w-full h-full object-contain"
                style={{ maxHeight: '100%' }}
                onPlay={() => base44.entities.StreamingContent.update(streamId, { views: (stream.views || 0) + 1 }).catch(() => {})}
              />
              <button
                onClick={() => setIsTheaterMode(v => !v)}
                className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full transition z-10"
              >
                {isTheaterMode ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
              </button>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <Video className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <p className="text-white text-xl font-bold mb-2">
                  {stream.status === 'ended' ? 'Stream Ended — No Recording Available' : 'Video Not Available'}
                </p>
                <Button onClick={() => navigate(-1)} className="bg-purple-600 hover:bg-purple-700">Back to Browse</Button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Right Sidebar */}
        {!isTheaterMode && (
          <div className="hidden lg:flex flex-col w-[380px] border-l border-white/10 bg-gray-950/90 backdrop-blur-xl">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-white/10 p-2 gap-1 flex-shrink-0">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition ${
                    activeTab === tab.id
                      ? `${tabColorMap[tab.color]} text-white`
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {activeTab === 'chat' && (
                <LivestreamChat streamId={streamId} isCreator={isStreamCreator} currentUser={currentUser} />
              )}
              {activeTab === 'polls' && (
                <div className="flex-1 overflow-y-auto p-4">
                  <LivestreamPolls streamId={streamId} isCreator={isStreamCreator} currentUser={currentUser} />
                </div>
              )}
              {activeTab === 'qa' && (
                <div className="flex-1 overflow-y-auto p-4">
                  <LivestreamQA streamId={streamId} isCreator={isStreamCreator} currentUser={currentUser} />
                </div>
              )}
              {activeTab === 'shop' && (
                <div className="flex-1 overflow-y-auto p-4">
                  <ProductShowcase streamId={streamId} isCreator={isStreamCreator} currentUser={currentUser} creatorEmail={stream.created_by} />
                </div>
              )}
              {activeTab === 'tips' && (
                <div className="flex-1 overflow-y-auto p-4">
                  <LiveTipFeed streamId={streamId} isCreator={isStreamCreator} />
                </div>
              )}
            </div>

            {/* Stream Info + Tipping */}
            <div className="border-t border-white/10 p-4 flex-shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 capitalize text-xs">
                    {stream.category}
                  </Badge>
                  <span className="text-gray-500 text-xs">{stream.views || 0} views</span>
                </div>
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.85 }} onClick={sendReaction} className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-full transition">
                    <Heart className="w-4 h-4 text-red-400" />
                  </motion.button>
                  {!isStreamCreator && currentUser && (
                    <JoinRequestButton streamId={streamId} currentUser={currentUser} isCreator={false} />
                  )}
                </div>
              </div>
              {currentUser && !isStreamCreator && (
                <LiveTippingOverlay streamId={streamId} creatorEmail={stream.created_by} currentUser={currentUser} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Clip Creator Modal */}
      <AnimatePresence>
        {showClipCreator && stream && currentUser && (
          <ClipCreator
            stream={stream}
            currentUser={currentUser}
            onClose={() => setShowClipCreator(false)}
          />
        )}
      </AnimatePresence>

      {/* Host Control Panel - Slide-in */}
      <AnimatePresence>
        {showHostPanel && isStreamCreator && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-[60px] bottom-0 w-80 bg-gray-900/95 backdrop-blur-xl border-l border-white/10 z-40 overflow-y-auto p-4 space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                Host Controls
              </h3>
              <button onClick={() => setShowHostPanel(false)} className="p-1.5 hover:bg-white/10 rounded-full">
                <ArrowLeft className="w-4 h-4 text-white rotate-180" />
              </button>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">Live Status</p>
                  <p className="text-red-300 text-xs flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Broadcasting
                  </p>
                </div>
                <Button
                  onClick={() => { if (confirm('End this livestream?')) endStreamMutation.mutate(); }}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <StopCircle className="w-4 h-4 mr-1" />
                  End
                </Button>
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-xl">
              <p className="text-white font-semibold text-sm mb-1">Live Stats</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-purple-300">
                  <Users className="w-4 h-4" />
                  <span className="font-bold">{viewerCount}</span>
                  <span className="text-gray-400">watching</span>
                </div>
              </div>
            </div>

            <LiveTipFeed streamId={streamId} isCreator={true} />
            <JoinRequestsPanel streamId={streamId} currentUser={currentUser} isCreator={true} />
            <CoHostManager streamId={streamId} currentUser={currentUser} isCreator={true} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (streamTiers.length > 0 && !isStreamCreator) {
    return <PPVTicketGate stream={stream} currentUser={currentUser}>{content}</PPVTicketGate>;
  }

  return content;
}

// Instagram/Kick/Twitch-style floating chat overlay for mobile
function MobileOverlayChat({ streamId, isCreator, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const chatEndRef = useRef(null);
  const MAX_VISIBLE = 30; // keep only last 30 messages visible

  useEffect(() => {
    if (!streamId) return;

    // Initial fetch
    base44.entities.LivestreamChat.filter({ stream_id: streamId, is_deleted: false })
      .then(msgs => {
        const sorted = msgs
          .filter(m => !m.is_deleted)
          .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
          .slice(-MAX_VISIBLE);
        setMessages(sorted);
      })
      .catch(() => {});

    // Real-time subscription
    const unsub = base44.entities.LivestreamChat.subscribe((event) => {
      if (event.data?.stream_id !== streamId) return;
      if (event.type === 'create' && !event.data?.is_deleted) {
        setMessages(prev => [...prev, event.data].slice(-MAX_VISIBLE));
      } else if (event.type === 'update') {
        setMessages(prev => prev.map(m => m.id === event.id ? event.data : m).filter(m => !m.is_deleted));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.id));
      }
    });

    return () => unsub();
  }, [streamId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!message.trim() || !currentUser) return;
    base44.entities.LivestreamChat.create({
      stream_id: streamId,
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email.split('@')[0],
      user_profile_picture: currentUser.profile_picture,
      message: message.trim(),
      is_deleted: false,
      is_pinned: false,
    }).catch(() => {});
    setMessage("");
  };

  const COLORS = ['#a78bfa', '#f472b6', '#34d399', '#60a5fa', '#fbbf24', '#fb923c'];
  const getColor = (name) => COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];

  return (
    <>
      {/* Floating message list — bottom-left, fades at top */}
      <div
        className="absolute left-0 bottom-14 w-full z-10 pointer-events-none"
        style={{ maxHeight: '55vh' }}
      >
        <div
          className="px-3 pb-2 overflow-y-auto flex flex-col justify-end"
          style={{
            maxHeight: '55vh',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%)',
          }}
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 mb-1.5"
              >
                {/* Avatar */}
                {msg.user_profile_picture ? (
                  <img src={msg.user_profile_picture} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: getColor(msg.user_name) }}
                  >
                    {msg.user_name?.[0]?.toUpperCase()}
                  </div>
                )}
                {/* Bubble */}
                <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-3 py-1.5 max-w-[80vw]">
                  <span className="text-xs font-bold mr-1.5" style={{ color: getColor(msg.user_name) }}>
                    {msg.user_name}
                  </span>
                  <span className="text-white text-sm">{msg.message}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Fixed input bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
        {currentUser ? (
          <div className="flex gap-2 items-center">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Say something..."
              className="flex-1 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white placeholder-gray-400 text-sm outline-none focus:border-purple-400 transition"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!message.trim()}
              className="w-10 h-10 bg-purple-600 disabled:bg-purple-600/40 rounded-full flex items-center justify-center flex-shrink-0 transition"
            >
              <Send className="w-4 h-4 text-white" />
            </motion.button>
          </div>
        ) : (
          <p className="text-center text-gray-400 text-xs">Sign in to chat</p>
        )}
      </div>
    </>
  );
}
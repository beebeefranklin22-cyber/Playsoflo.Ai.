import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Play, Eye, Star, Clock, Film, Tv, Users, Heart,
  Settings, DollarSign, Radio, Search, Grid3X3, List, UserCheck, Share2
} from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function CreatorChannel() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const username = params.get("username");
  const creatorEmail = params.get("email");

  const [currentUser, setCurrentUser] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("videos");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Find creator by username or email
  const { data: creator } = useQuery({
    queryKey: ["channel-creator", username, creatorEmail],
    queryFn: async () => {
      if (creatorEmail) {
        const users = await base44.entities.User.filter({ email: creatorEmail });
        return users[0] || null;
      }
      if (username) {
        const users = await base44.entities.User.filter({ username });
        return users[0] || null;
      }
      return null;
    },
    enabled: !!(username || creatorEmail)
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["channel-videos", creator?.email],
    queryFn: () => base44.entities.StreamingContent.filter({ creator_email: creator.email, status: "published" }),
    enabled: !!creator?.email
  });

  const { data: liveStreams = [] } = useQuery({
    queryKey: ["channel-live", creator?.email],
    queryFn: () => base44.entities.StreamingContent.filter({ creator_email: creator.email, is_live: true }),
    enabled: !!creator?.email,
    refetchInterval: 15000
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["channel-followers", creator?.email],
    queryFn: () => base44.entities.Follow.filter({ following_email: creator.email }),
    enabled: !!creator?.email
  });

  useEffect(() => {
    if (!currentUser || !creator) return;
    base44.entities.Follow.filter({ follower_email: currentUser.email, following_email: creator.email })
      .then(f => setIsFollowing(f.length > 0)).catch(() => {});
  }, [currentUser, creator]);

  const handleFollow = async () => {
    if (!currentUser) { base44.auth.redirectToLogin(); return; }
    if (isFollowing) {
      const f = await base44.entities.Follow.filter({ follower_email: currentUser.email, following_email: creator.email });
      if (f[0]) await base44.entities.Follow.delete(f[0].id);
      setIsFollowing(false);
    } else {
      await base44.entities.Follow.create({ follower_email: currentUser.email, following_email: creator.email });
      setIsFollowing(true);
      toast.success(`Following @${creator.username || creator.full_name}!`);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url).then(() => toast.success("Channel link copied!")).catch(() => {});
  };

  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const isOwnChannel = currentUser?.email === creator?.email;

  const tabVideos = activeTab === "videos" ? videos.filter(v => !v.is_live) : videos.filter(v => v.type === "live_event");

  if (!creator) {
    return (
      <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading channel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-[#0e0e10]/95 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <p className="text-white font-bold">@{creator.username || creator.full_name}</p>
          <p className="text-gray-500 text-xs">{followers.length} followers · {totalViews.toLocaleString()} views</p>
        </div>
        <button onClick={handleShare} className="p-2 hover:bg-white/10 rounded-full">
          <Share2 className="w-4 h-4 text-gray-400" />
        </button>
        {isOwnChannel && (
          <Button size="sm" onClick={() => navigate(createPageUrl("CreatorDashboard"))} className="bg-purple-600 hover:bg-purple-700">
            <Settings className="w-4 h-4 mr-1" /> Dashboard
          </Button>
        )}
      </div>

      {/* Channel Banner */}
      <div className="relative">
        <div className="h-36 bg-gradient-to-br from-purple-900 via-violet-900 to-indigo-900" />
        <div className="absolute bottom-0 left-0 right-0 translate-y-1/2 px-4 flex items-end justify-between">
          <div className="flex items-end gap-3">
            {creator.profile_picture ? (
              <img src={creator.profile_picture} alt={creator.full_name}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-[#0e0e10]" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold border-4 border-[#0e0e10]">
                {creator.full_name?.[0] || creator.email?.[0]}
              </div>
            )}
          </div>
          <div className="flex gap-2 mb-1">
            {!isOwnChannel && (
              <Button
                onClick={handleFollow}
                size="sm"
                className={isFollowing ? "bg-white/10 border border-white/20 text-white" : "bg-purple-600 hover:bg-purple-700"}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Creator Info */}
      <div className="px-4 pt-14 pb-4">
        <h1 className="text-2xl font-extrabold text-white">{creator.full_name}</h1>
        <p className="text-purple-400 font-semibold">@{creator.username || creator.full_name?.toLowerCase().replace(/\s+/g, '')}</p>
        {creator.bio && <p className="text-gray-400 text-sm mt-2">{creator.bio}</p>}

        {/* Live badge */}
        {liveStreams.length > 0 && (
          <div
            onClick={() => navigate(createPageUrl("LivestreamViewer") + `?id=${liveStreams[0].id}`)}
            className="mt-3 flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-xl px-4 py-3 cursor-pointer hover:bg-red-600/30 transition"
          >
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 font-bold text-sm">LIVE NOW</span>
            <span className="text-white text-sm flex-1 truncate">{liveStreams[0].title}</span>
            <Play className="w-4 h-4 text-red-400 flex-shrink-0" />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Videos", value: videos.length, color: "text-purple-400" },
            { label: "Followers", value: followers.length, color: "text-blue-400" },
            { label: "Total Views", value: totalViews.toLocaleString(), color: "text-green-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className={`font-bold text-lg ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4">
        {["videos", "streams"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-semibold capitalize transition ${activeTab === tab ? "text-white border-b-2 border-purple-500" : "text-gray-500 hover:text-white"}`}
          >
            {tab}
          </button>
        ))}
        <div className="flex items-center gap-1 ml-auto pb-2">
          <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "text-white" : "text-gray-500"}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "text-white" : "text-gray-500"}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {tabVideos.length === 0 ? (
          <div className="text-center py-16">
            <Film className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No {activeTab} yet</p>
            {isOwnChannel && (
              <Button onClick={() => navigate(createPageUrl("Streaming"))} className="mt-4 bg-purple-600 hover:bg-purple-700" size="sm">
                Upload Content
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {tabVideos.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(createPageUrl("VODPlayer") + `?id=${v.id}`)}
                className="cursor-pointer group"
              >
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-900">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <Tv className="w-8 h-8 text-gray-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  {v.is_monetized && (
                    <div className="absolute top-2 left-2 bg-green-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <DollarSign className="w-2.5 h-2.5" />{v.price_usd || v.rental_price_usd}
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">{v.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-gray-400 text-[10px]">
                      <Eye className="w-2.5 h-2.5" />{(v.views || 0).toLocaleString()}
                      {v.rating > 0 && <><Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />{v.rating}</>}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {tabVideos.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(createPageUrl("VODPlayer") + `?id=${v.id}`)}
                className="flex gap-3 bg-white/5 border border-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/8 transition"
              >
                <div className="w-28 h-20 rounded-lg bg-gray-900 flex-shrink-0 overflow-hidden">
                  {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" /> : <Tv className="w-6 h-6 text-gray-600 m-auto mt-7" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm line-clamp-2">{v.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-gray-500 text-xs">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(v.views || 0).toLocaleString()}</span>
                    {v.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{v.duration}</span>}
                    {v.is_monetized && <span className="text-green-400 font-semibold">${v.price_usd || v.rental_price_usd}</span>}
                  </div>
                  {v.description && <p className="text-gray-600 text-xs mt-1 line-clamp-1">{v.description}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
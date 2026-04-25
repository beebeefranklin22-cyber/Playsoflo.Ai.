import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  TrendingUp, Radio, Play, Heart, Eye, MessageCircle,
  Flame, Users, Music, Video, Filter, Crown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

function computeScore(item) {
  const hoursSinceCreated = (Date.now() - new Date(item.created_date).getTime()) / 3600000;
  const recencyDecay = Math.max(0, 1 - hoursSinceCreated / 72);
  const likes = item.likes_count || 0;
  const views = item.views || item.views_count || item.live_viewers || 0;
  const comments = item.comments_count || 0;
  const isLive = item.is_live ? 50 : 0;
  return likes * 3 + views * 1 + comments * 5 + isLive + recencyDecay * 20;
}

const TABS = ['All', 'Posts', 'Reels', 'Live', 'Trending'];

export default function Discover() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: posts = [] } = useQuery({
    queryKey: ['discover-posts'],
    queryFn: () => base44.entities.SocialPost.list('-created_date', 60),
    initialData: [],
    refetchInterval: 60000,
  });

  const { data: reels = [] } = useQuery({
    queryKey: ['discover-reels'],
    queryFn: () => base44.entities.Reel.list('-created_date', 40),
    initialData: [],
    refetchInterval: 60000,
  });

  const { data: streams = [] } = useQuery({
    queryKey: ['discover-streams'],
    queryFn: () => base44.entities.StreamingContent.filter({ status: 'published' }, '-created_date', 20),
    initialData: [],
    refetchInterval: 30000,
  });

  const validPosts = posts.filter(p =>
    !p.is_story &&
    p.image_url?.startsWith('http') &&
    !p.image_url.includes('text-story') &&
    !p.image_url.includes('example-')
  ).map(p => ({ ...p, _type: 'post', _score: computeScore(p) }));

  const validReels = reels.filter(r => r.video_url || r.thumbnail_url)
    .map(r => ({ ...r, _type: 'reel', _score: computeScore(r) }));

  const liveStreams = streams.filter(s => s.is_live)
    .map(s => ({ ...s, _type: 'livestream', _score: computeScore(s) }));

  const feed = useMemo(() => {
    if (activeTab === 'Posts') return [...validPosts].sort((a, b) => b._score - a._score);
    if (activeTab === 'Reels') return [...validReels].sort((a, b) => b._score - a._score);
    if (activeTab === 'Live') return [...liveStreams].sort((a, b) => b._score - a._score);
    if (activeTab === 'Trending') {
      return [...validPosts, ...validReels, ...liveStreams]
        .sort((a, b) => b._score - a._score)
        .slice(0, 40);
    }
    // All: interleave reels and posts for discovery
    const mixed = [...validReels, ...validPosts, ...liveStreams].sort((a, b) => b._score - a._score);
    return mixed;
  }, [activeTab, validPosts, validReels, liveStreams]);

  const liveCount = liveStreams.length;

  const handleClick = (item) => {
    if (item._type === 'livestream') {
      navigate(createPageUrl('LivestreamViewer') + `?id=${item.id}`);
    } else if (item._type === 'reel') {
      navigate(createPageUrl('Reels'));
    } else {
      navigate(createPageUrl('UserProfile') + `?user=${item.created_by}`);
    }
  };

  // Masonry-style varying heights
  const getMasonryHeight = (idx) => {
    const pattern = [200, 280, 200, 240, 200, 260, 200, 220];
    return pattern[idx % pattern.length];
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-16 z-10 bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Discover
            </h1>
            <p className="text-gray-500 text-xs">Popular reels & curated posts</p>
          </div>
          {liveCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-300 text-sm font-semibold">{liveCount} Live</span>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Live strip at top when All/Live tab */}
      {liveStreams.length > 0 && (activeTab === 'All' || activeTab === 'Live') && (
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            Live Now
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {liveStreams.slice(0, 6).map(stream => (
              <motion.div
                key={stream.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate(createPageUrl('LivestreamViewer') + `?id=${stream.id}`)}
                className="flex-shrink-0 w-36 rounded-xl overflow-hidden cursor-pointer border border-red-500/30 relative"
              >
                {stream.thumbnail_url ? (
                  <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-24 object-cover" />
                ) : (
                  <div className="w-full h-24 bg-gradient-to-br from-red-900/60 to-pink-900/60 flex items-center justify-center">
                    <Radio className="w-8 h-8 text-red-400 animate-pulse" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute top-1.5 left-1.5">
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded-full text-white text-[10px] font-bold">
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" />LIVE
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white text-xs font-semibold truncate">{stream.title}</p>
                  <div className="flex items-center gap-1 text-gray-300 text-[10px]">
                    <Users className="w-2.5 h-2.5" />
                    {stream.live_viewers || 0}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Masonry grid */}
      <div className="px-3 pt-3">
        {feed.length === 0 ? (
          <div className="text-center py-20">
            <TrendingUp className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            <p className="text-white text-lg font-bold mb-2">Nothing here yet</p>
            <p className="text-gray-400 text-sm">Be the first to create trending content!</p>
          </div>
        ) : (
          /* Two-column masonry layout */
          <div className="flex gap-2">
            {/* Left column */}
            <div className="flex-1 flex flex-col gap-2">
              {feed.filter((_, i) => i % 2 === 0).map((item, idx) => (
                <MasonryCard
                  key={`${item._type}-${item.id}`}
                  item={item}
                  idx={idx * 2}
                  height={getMasonryHeight(idx * 2)}
                  onClick={() => handleClick(item)}
                />
              ))}
            </div>
            {/* Right column — offset for masonry feel */}
            <div className="flex-1 flex flex-col gap-2 mt-8">
              {feed.filter((_, i) => i % 2 === 1).map((item, idx) => (
                <MasonryCard
                  key={`${item._type}-${item.id}`}
                  item={item}
                  idx={idx * 2 + 1}
                  height={getMasonryHeight(idx * 2 + 1)}
                  onClick={() => handleClick(item)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MasonryCard({ item, idx, height, onClick }) {
  const thumb = item.thumbnail_url || item.image_url || item.featured_image || item.cover_art_url;
  const title = item.title || item.caption || '';

  const typeBadge = () => {
    if (item._type === 'livestream') return (
      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded-full text-white text-[10px] font-bold">
        <span className="w-1 h-1 bg-white rounded-full animate-pulse" />LIVE
      </span>
    );
    if (item._type === 'reel') return (
      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-600/80 rounded-full text-white text-[10px] font-bold">
        <Play className="w-2 h-2" />Reel
      </span>
    );
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.03, 0.4) }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer group bg-white/5"
      style={{ height }}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-900/60 to-pink-900/60 flex items-center justify-center">
          {item._type === 'reel' ? <Video className="w-8 h-8 text-cyan-400" /> : <Heart className="w-8 h-8 text-pink-400" />}
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

      {/* Top badges */}
      <div className="absolute top-2 left-2 flex gap-1">
        {typeBadge()}
        {idx < 6 && (
          <span className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            {idx + 1}
          </span>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        {title && (
          <p className="text-white text-xs font-semibold line-clamp-2 mb-1">{title}</p>
        )}
        <div className="flex items-center gap-2 text-gray-300 text-[10px]">
          {(item.likes_count || 0) > 0 && (
            <span className="flex items-center gap-0.5">
              <Heart className="w-2.5 h-2.5 text-rose-400" />
              {item.likes_count}
            </span>
          )}
          {(item.views || item.views_count || 0) > 0 && (
            <span className="flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5 text-blue-400" />
              {item.views || item.views_count}
            </span>
          )}
          {(item.comments_count || 0) > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageCircle className="w-2.5 h-2.5 text-green-400" />
              {item.comments_count}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
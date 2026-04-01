import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  TrendingUp, Radio, Play, Heart, Eye, MessageCircle,
  Flame, Star, Users, Zap, Music, Video, Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Engagement score algorithm: weighted formula
function computeScore(item) {
  const hoursSinceCreated = (Date.now() - new Date(item.created_date).getTime()) / 3600000;
  const recencyDecay = Math.max(0, 1 - hoursSinceCreated / 72); // 72h half-life
  const likes = item.likes_count || (item.likes?.length) || 0;
  const views = item.views || item.live_viewers || 0;
  const comments = item.comments_count || item.reply_count || 0;
  const isLive = item.is_live ? 50 : 0; // Big boost for live
  return likes * 3 + views * 1 + comments * 5 + isLive + recencyDecay * 20;
}

const FILTERS = ['All', 'Live', 'Trending', 'Posts', 'Streams', 'Music', 'News'];

export default function Discover() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: streams = [] } = useQuery({
    queryKey: ['discover-streams'],
    queryFn: () => base44.entities.StreamingContent.filter({ status: 'published' }, '-created_date', 30),
    initialData: [],
    refetchInterval: 30000
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['discover-posts'],
    queryFn: () => base44.entities.SocialPost.list('-created_date', 50),
    initialData: [],
    refetchInterval: 60000
  });

  const { data: newsPosts = [] } = useQuery({
    queryKey: ['discover-news'],
    queryFn: () => base44.entities.NewsPost.filter({ status: 'published' }, '-created_date', 20),
    initialData: [],
    refetchInterval: 60000
  });

  const { data: musicTracks = [] } = useQuery({
    queryKey: ['discover-music'],
    queryFn: () => base44.entities.MusicTrack.filter({ status: 'published' }, '-stream_count', 20),
    initialData: [],
    refetchInterval: 120000
  });

  // Normalize and rank all content
  const rankedFeed = useMemo(() => {
    const liveStreams = streams.filter(s => s.is_live).map(s => ({
      ...s, _type: 'livestream', _score: computeScore(s)
    }));
    const vodStreams = streams.filter(s => !s.is_live).map(s => ({
      ...s, _type: 'stream', _score: computeScore(s)
    }));
    const socialPosts = posts
      .filter(p => !p.is_story && p.caption && p.image_url?.startsWith('http'))
      .map(p => ({ ...p, _type: 'post', _score: computeScore(p) }));
    const news = newsPosts.map(n => ({ ...n, _type: 'news', _score: computeScore(n) }));
    const music = musicTracks.map(m => ({ ...m, _type: 'music', _score: computeScore(m) }));

    let all = [...liveStreams, ...vodStreams, ...socialPosts, ...news, ...music];

    if (activeFilter === 'Live') all = liveStreams;
    else if (activeFilter === 'Trending') all = all.sort((a, b) => b._score - a._score).slice(0, 30);
    else if (activeFilter === 'Posts') all = socialPosts;
    else if (activeFilter === 'Streams') all = [...liveStreams, ...vodStreams];
    else if (activeFilter === 'Music') all = music;
    else if (activeFilter === 'News') all = news;

    return all.sort((a, b) => b._score - a._score);
  }, [streams, posts, newsPosts, musicTracks, activeFilter]);

  const liveCount = streams.filter(s => s.is_live).length;

  const handleItemClick = (item) => {
    if (item._type === 'livestream' || item._type === 'stream') {
      navigate(createPageUrl('LivestreamViewer') + `?id=${item.id}`);
    } else if (item._type === 'music') {
      navigate(createPageUrl('Vibe'));
    } else if (item._type === 'news') {
      navigate(createPageUrl('CommunityNews'));
    } else {
      navigate(createPageUrl('Home'));
    }
  };

  const typeIcon = (type) => {
    if (type === 'livestream') return <Radio className="w-3 h-3 text-red-400" />;
    if (type === 'stream') return <Video className="w-3 h-3 text-purple-400" />;
    if (type === 'music') return <Music className="w-3 h-3 text-pink-400" />;
    if (type === 'news') return <MessageCircle className="w-3 h-3 text-blue-400" />;
    return <Heart className="w-3 h-3 text-rose-400" />;
  };

  const typeBadge = (item) => {
    if (item._type === 'livestream') return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded-full text-white text-xs font-bold">
        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />LIVE
      </span>
    );
    if (item._type === 'stream') return <Badge className="bg-purple-500/20 text-purple-300 text-xs border-0">VOD</Badge>;
    if (item._type === 'music') return <Badge className="bg-pink-500/20 text-pink-300 text-xs border-0">Music</Badge>;
    if (item._type === 'news') return <Badge className="bg-blue-500/20 text-blue-300 text-xs border-0">News</Badge>;
    return null;
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-16 z-10 bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              Discover
            </h1>
            <p className="text-gray-400 text-sm">Trending content ranked by engagement</p>
          </div>
          {liveCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-300 text-sm font-semibold">{liveCount} Live</span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition ${
                activeFilter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Live - top of feed */}
      {streams.filter(s => s.is_live).slice(0, 3).length > 0 && activeFilter === 'All' && (
        <div className="px-4 pt-4">
          <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-400 animate-pulse" />
            Live Now
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {streams.filter(s => s.is_live).slice(0, 3).map(stream => (
              <motion.div
                key={stream.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(createPageUrl('LivestreamViewer') + `?id=${stream.id}`)}
                className="relative rounded-2xl overflow-hidden cursor-pointer border border-red-500/30 bg-gradient-to-br from-red-950/50 to-pink-950/50"
              >
                {stream.thumbnail_url ? (
                  <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-red-800/40 to-pink-800/40 flex items-center justify-center">
                    <Radio className="w-12 h-12 text-red-400 animate-pulse" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute top-2 left-2">
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded-full text-white text-xs font-bold">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />LIVE
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-bold text-sm truncate">{stream.title}</p>
                  <div className="flex items-center gap-2 text-gray-300 text-xs mt-1">
                    <Users className="w-3 h-3" />
                    <span>{stream.live_viewers || 0} watching</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Ranked Feed */}
      <div className="px-4 pb-4">
        {activeFilter !== 'All' && (
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            {activeFilter}
          </h2>
        )}
        {activeFilter === 'All' && (
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            Trending Now
          </h2>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rankedFeed.map((item, idx) => (
            <motion.div
              key={`${item._type}-${item.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.5) }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleItemClick(item)}
              className="relative rounded-2xl overflow-hidden cursor-pointer bg-white/5 border border-white/10 hover:border-purple-500/40 transition group"
            >
              {/* Media */}
              <div className="relative h-44">
                {(item.thumbnail_url || item.image_url || item.featured_image || item.cover_art_url) ? (
                  <img
                    src={item.thumbnail_url || item.image_url || item.featured_image || item.cover_art_url}
                    alt={item.title || item.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
                    {typeIcon(item._type)}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {typeBadge(item)}
                </div>

                {/* Trending rank badge for top 10 */}
                {idx < 10 && activeFilter !== 'Live' && (
                  <div className="absolute top-2 right-2 w-7 h-7 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    {idx + 1}
                  </div>
                )}

                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-white font-semibold text-sm line-clamp-2 mb-2">
                  {item.title || item.caption || 'Untitled'}
                </p>
                <div className="flex items-center gap-3 text-gray-400 text-xs">
                  {(item.likes_count || 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-400" />
                      {(item.likes_count || 0).toLocaleString()}
                    </span>
                  )}
                  {(item.views || item.stream_count || 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-blue-400" />
                      {(item.views || item.stream_count || 0).toLocaleString()}
                    </span>
                  )}
                  {(item.comments_count || 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3 text-green-400" />
                      {item.comments_count}
                    </span>
                  )}
                  {/* Engagement score bar */}
                  <div className="ml-auto flex items-center gap-1">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">{Math.round(item._score)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {rankedFeed.length === 0 && (
          <div className="text-center py-20">
            <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-white text-xl font-bold mb-2">Nothing here yet</p>
            <p className="text-gray-400">Be the first to create trending content!</p>
          </div>
        )}
      </div>
    </div>
  );
}
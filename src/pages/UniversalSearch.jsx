import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Search, User, Briefcase, Music, Tv, Sparkles,
  Star, MapPin, DollarSign, ChevronRight, Filter,
  X, TrendingUp, AtSign, Clock, Video, SlidersHorizontal
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const VIDEO_CATEGORIES = [
  "all", "sports", "entertainment", "gaming", "music", "news", "lifestyle", "betting"
];

const DURATION_OPTIONS = [
  { value: "all", label: "Any Duration" },
  { value: "short", label: "Short (< 5 min)" },
  { value: "medium", label: "Medium (5–30 min)" },
  { value: "long", label: "Long (> 30 min)" },
];

function parseDurationToSeconds(duration) {
  if (!duration) return null;
  const parts = duration.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function matchesDurationFilter(duration, filter) {
  if (filter === "all") return true;
  const secs = parseDurationToSeconds(duration);
  if (secs === null) return true;
  if (filter === "short") return secs < 300;
  if (filter === "medium") return secs >= 300 && secs <= 1800;
  if (filter === "long") return secs > 1800;
  return true;
}

export default function UniversalSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Video-specific filters
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: users = [] } = useQuery({
    queryKey: ['search-users', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const term = debouncedQuery.toLowerCase().replace('@', '');

      const [posts, items, reels, reviews, comments, follows] = await Promise.all([
        base44.entities.SocialPost.list('-created_date', 300).catch(() => []),
        base44.entities.MarketplaceItem.list('-created_date', 200).catch(() => []),
        base44.entities.Reel.list('-created_date', 200).catch(() => []),
        base44.entities.Review.list('-created_date', 200).catch(() => []),
        base44.entities.Comment.list('-created_date', 200).catch(() => []),
        base44.entities.Follow.list('-created_date', 200).catch(() => []),
      ]);

      const seen = new Set();
      const results = [];

      const addUser = (key, name, username, photo, bio) => {
        if (!key || seen.has(key)) return;
        const n = (name || '').toLowerCase();
        const u = (username || '').toLowerCase();
        if (n.includes(term) || u.includes(term) || key.toLowerCase().includes(term)) {
          seen.add(key);
          results.push({ id: key, email: key, full_name: name || username || key, username, profile_photo: photo, bio: bio || null });
        }
      };

      for (const p of posts) addUser(p.created_by || p.creator_email, p.creator_name, p.creator_username, p.creator_photo, null);
      for (const r of reels) addUser(r.creator_email, r.creator_name, null, r.creator_photo, null);
      for (const rv of reviews) addUser(rv.reviewer_email, rv.reviewer_name, null, rv.reviewer_avatar, null);
      for (const c of comments) addUser(c.author_email, c.author_name, c.author_username, c.author_photo, null);
      for (const f of follows) {
        addUser(f.follower_email, f.follower_name, f.follower_username, f.follower_photo, null);
        addUser(f.following_email, f.following_name, f.following_username, f.following_photo, null);
      }
      for (const item of items) addUser(item.provider_email, item.provider_name, null, null, item.description);

      return results;
    },
    enabled: debouncedQuery.length > 0
  });

  const { data: services = [] } = useQuery({
    queryKey: ['search-services', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const all = await base44.entities.MarketplaceItem.list();
      return all.filter(s =>
        s.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        s.category?.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
    },
    enabled: debouncedQuery.length > 0
  });

  const { data: experiences = [] } = useQuery({
    queryKey: ['search-experiences', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const all = await base44.entities.Experience.list();
      return all.filter(e =>
        e.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        e.location?.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
    },
    enabled: debouncedQuery.length > 0
  });

  const { data: allStreaming = [] } = useQuery({
    queryKey: ['search-streaming', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery && categoryFilter === "all" && durationFilter === "all" && !creatorFilter) return [];
      const all = await base44.entities.StreamingContent.list();
      return all.filter(c =>
        !debouncedQuery ||
        c.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        c.creator_username?.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
    },
    enabled: debouncedQuery.length > 0
  });

  // Apply video filters client-side
  const streaming = useMemo(() => {
    return allStreaming.filter(c => {
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      if (!matchesDurationFilter(c.duration, durationFilter)) return false;
      if (creatorFilter && !c.creator_username?.toLowerCase().includes(creatorFilter.toLowerCase())) return false;
      return true;
    });
  }, [allStreaming, categoryFilter, durationFilter, creatorFilter]);

  const totalResults = users.length + services.length + experiences.length + streaming.length;

  const ResultCard = ({ item, type, icon: Icon, onClick }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className="bg-white/5 border-white/10 hover:bg-white/10 transition group cursor-pointer"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {item.image_url || item.thumbnail_url || item.profile_photo ? (
              <img
                src={item.image_url || item.thumbnail_url || item.profile_photo}
                alt={item.title || item.full_name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-8 h-8 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-white font-bold group-hover:text-purple-400 transition truncate">
                  {item.title || item.full_name || item.name}
                </h3>
                <Badge className="bg-purple-500/20 text-purple-300 shrink-0 text-xs">{type}</Badge>
              </div>
              {(item.creator_username || item.username) && (
                <p className="text-purple-400 text-xs flex items-center gap-1 mb-1">
                  <AtSign className="w-3 h-3" />{item.creator_username || item.username}
                </p>
              )}
              {item.description && (
                <p className="text-gray-400 text-sm line-clamp-2">{item.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                {item.price != null && (
                  <span className="text-green-400 flex items-center gap-1"><DollarSign className="w-3 h-3" />${item.price}</span>
                )}
                {item.rating && (
                  <span className="text-yellow-400 flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400" />{item.rating}</span>
                )}
                {item.duration && (
                  <span className="text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{item.duration}</span>
                )}
                {item.category && (
                  <Badge className="bg-indigo-500/20 text-indigo-300 text-[10px] capitalize">{item.category.replace(/_/g, ' ')}</Badge>
                )}
                {item.location && (
                  <span className="text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const hasActiveFilters = categoryFilter !== "all" || durationFilter !== "all" || creatorFilter;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-lg transition">
              <X className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white flex-1">Search</h1>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${showFilters || hasActiveFilters ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasActiveFilters && <span className="w-2 h-2 bg-yellow-400 rounded-full" />}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search videos, creators, services..."
              className="pl-12 pr-4 py-5 bg-white/10 border-white/20 text-white text-base placeholder-gray-400 rounded-xl"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            )}
          </div>

          {/* Video Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> Video Filters
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Category</label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VIDEO_CATEGORIES.map(c => (
                            <SelectItem key={c} value={c} className="capitalize">
                              {c === "all" ? "All Categories" : c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Duration</label>
                      <Select value={durationFilter} onValueChange={setDurationFilter}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Creator</label>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          value={creatorFilter}
                          onChange={e => setCreatorFilter(e.target.value)}
                          placeholder="username..."
                          className="w-full pl-8 pr-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={() => { setCategoryFilter("all"); setDurationFilter("all"); setCreatorFilter(""); }}
                      className="text-xs text-purple-400 hover:text-purple-300 transition"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {debouncedQuery && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="text-gray-400">
                <span className="text-white font-bold">{totalResults}</span> results for &ldquo;{debouncedQuery}&rdquo;
              </p>
              {totalResults > 0 && (
                <span className="text-purple-400 flex items-center gap-1 text-xs">
                  <TrendingUp className="w-3.5 h-3.5" /> Best matches first
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        {!debouncedQuery ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <Search className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Start Searching</h2>
            <p className="text-gray-400 max-w-sm mx-auto text-sm">
              Find videos, creators, services, experiences, and more across PlaySoFlo.
            </p>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md mx-auto">
              {["gaming", "sports", "music", "lifestyle"].map(tag => (
                <button
                  key={tag}
                  onClick={() => { setSearchQuery(tag); setCategoryFilter(tag); setActiveTab("shows"); }}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-sm hover:bg-white/10 capitalize transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : totalResults === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Results Found</h2>
            <p className="text-gray-400 text-sm">Try a different search or adjust your filters.</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex w-full bg-white/10 border border-white/20 mb-5 overflow-x-auto rounded-xl">
              {[
                { value: "all", label: "All", count: totalResults },
                { value: "shows", label: "Videos", count: streaming.length, color: "bg-red-500" },
                { value: "users", label: "Users", count: users.length, color: "bg-blue-500" },
                { value: "services", label: "Services", count: services.length, color: "bg-green-500" },
                { value: "experiences", label: "Experiences", count: experiences.length, color: "bg-pink-500" },
              ].map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 flex-shrink-0">
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`${tab.color || 'bg-purple-500'} text-white text-[10px] px-1.5 py-0.5 rounded-full`}>
                      {tab.count}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {streaming.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-white font-bold flex items-center gap-2"><Tv className="w-4 h-4" /> Videos ({streaming.length})</h3>
                  {streaming.slice(0, 3).map(c => (
                    <ResultCard key={c.id} item={c} type="Video" icon={Tv} onClick={() => navigate(createPageUrl("VODPlayer") + `?id=${c.id}`)} />
                  ))}
                  {streaming.length > 3 && <Button variant="outline" className="w-full text-sm" onClick={() => setActiveTab("shows")}>View all {streaming.length} videos</Button>}
                </section>
              )}
              {users.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-white font-bold flex items-center gap-2"><User className="w-4 h-4" /> Users ({users.length})</h3>
                  {users.slice(0, 3).map(u => (
                    <ResultCard key={u.id} item={u} type="User" icon={User} onClick={() => navigate(createPageUrl("UserProfile") + `?email=${encodeURIComponent(u.email)}`)} />
                  ))}
                  {users.length > 3 && <Button variant="outline" className="w-full text-sm" onClick={() => setActiveTab("users")}>View all {users.length} users</Button>}
                </section>
              )}
              {services.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-white font-bold flex items-center gap-2"><Briefcase className="w-4 h-4" /> Services ({services.length})</h3>
                  {services.slice(0, 3).map(s => (
                    <ResultCard key={s.id} item={s} type="Service" icon={Briefcase} onClick={() => navigate(createPageUrl("Marketplace"))} />
                  ))}
                  {services.length > 3 && <Button variant="outline" className="w-full text-sm" onClick={() => setActiveTab("services")}>View all {services.length} services</Button>}
                </section>
              )}
              {experiences.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-white font-bold flex items-center gap-2"><Sparkles className="w-4 h-4" /> Experiences ({experiences.length})</h3>
                  {experiences.slice(0, 3).map(e => (
                    <ResultCard key={e.id} item={e} type="Experience" icon={Sparkles} onClick={() => navigate(createPageUrl("explore"))} />
                  ))}
                  {experiences.length > 3 && <Button variant="outline" className="w-full text-sm" onClick={() => setActiveTab("experiences")}>View all {experiences.length} experiences</Button>}
                </section>
              )}
            </TabsContent>

            <TabsContent value="shows" className="space-y-3">
              {streaming.map(c => (
                <ResultCard key={c.id} item={c} type="Video" icon={Tv} onClick={() => navigate(createPageUrl("VODPlayer") + `?id=${c.id}`)} />
              ))}
            </TabsContent>
            <TabsContent value="users" className="space-y-3">
              {users.map(u => (
                <ResultCard key={u.id} item={u} type="User" icon={User} onClick={() => navigate(createPageUrl("UserProfile") + `?email=${encodeURIComponent(u.email)}`)} />
              ))}
            </TabsContent>
            <TabsContent value="services" className="space-y-3">
              {services.map(s => (
                <ResultCard key={s.id} item={s} type="Service" icon={Briefcase} onClick={() => navigate(createPageUrl("Marketplace"))} />
              ))}
            </TabsContent>
            <TabsContent value="experiences" className="space-y-3">
              {experiences.map(e => (
                <ResultCard key={e.id} item={e} type="Experience" icon={Sparkles} onClick={() => navigate(createPageUrl("explore"))} />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
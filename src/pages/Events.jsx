import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, MapPin, Plus, Heart, MessageCircle, Share2,
  Bookmark, Search, Filter, Clock, Users, Ticket,
  X, Upload, Eye, EyeOff, ChevronDown, Loader2, Send
} from "lucide-react";
import { toast } from "sonner";
import PostComments from "../components/social/PostComments";

const CATEGORIES = [
  { value: "all", label: "All Events" },
  { value: "music", label: "🎵 Music" },
  { value: "sports", label: "⚽ Sports" },
  { value: "food_drink", label: "🍽️ Food & Drink" },
  { value: "arts", label: "🎨 Arts" },
  { value: "networking", label: "🤝 Networking" },
  { value: "nightlife", label: "🌃 Nightlife" },
  { value: "community", label: "🏘️ Community" },
  { value: "fitness", label: "💪 Fitness" },
  { value: "education", label: "📚 Education" },
  { value: "charity", label: "❤️ Charity" },
  { value: "festival", label: "🎉 Festival" },
  { value: "other", label: "✨ Other" }
];

const categoryEmoji = { music: "🎵", sports: "⚽", food_drink: "🍽️", arts: "🎨", networking: "🤝", nightlife: "🌃", community: "🏘️", fitness: "💪", education: "📚", charity: "❤️", festival: "🎉", other: "✨" };

function CreateEventModal({ currentUser, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "", description: "", event_date: "", end_date: "",
    location: "", address: "", city: "", category: "other",
    ticket_price: 0, is_free: true, ticket_url: "", capacity: "",
    tags: "", is_anonymous: false, cover_image: ""
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("cover_image", file_url);
    } catch { toast.error("Image upload failed"); }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title required"); return; }
    if (!form.event_date) { toast.error("Event date required"); return; }
    setSubmitting(true);
    try {
      const event = await base44.entities.Event.create({
        ...form,
        ticket_price: form.is_free ? 0 : parseFloat(form.ticket_price) || 0,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        organizer_name: form.is_anonymous ? "Anonymous" : (currentUser?.full_name || ""),
        organizer_email: form.is_anonymous ? "" : currentUser?.email,
        organizer_photo: form.is_anonymous ? "" : currentUser?.profile_picture,
        status: "upcoming",
        likes_count: 0, liked_by: [], comments_count: 0, saves_count: 0, saved_by: [], views: 0
      });
      toast.success("Event created!");
      onCreated(event);
      onClose();
    } catch (err) { toast.error("Failed to create event: " + err.message); }
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-gray-900 rounded-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: "90dvh" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-600/30 to-pink-600/30 flex-shrink-0">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-400" />Create Event</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Cover image */}
          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">Cover Image</label>
            {form.cover_image ? (
              <div className="relative">
                <img src={form.cover_image} alt="cover" className="w-full h-36 object-cover rounded-xl" />
                <button type="button" onClick={() => set("cover_image", "")} className="absolute top-2 right-2 p-1 bg-black/60 rounded-full"><X className="w-4 h-4 text-white" /></button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-purple-500 transition">
                {uploading ? <Loader2 className="w-6 h-6 text-purple-400 animate-spin" /> : <><Upload className="w-6 h-6 text-gray-400 mb-1" /><span className="text-gray-400 text-sm">Upload cover image or video</span></>}
                <input type="file" accept="image/*,video/*" className="hidden" onChange={handleImage} disabled={uploading} />
              </label>
            )}
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">Event Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="What's happening?" required
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600" />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Tell people about your event..." rows={3}
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Start Date & Time *</label>
              <input type="datetime-local" value={form.event_date} onChange={e => set("event_date", e.target.value)} required
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">End Date & Time</label>
              <input type="datetime-local" value={form.end_date} onChange={e => set("end_date", e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">Location / Venue</label>
            <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Venue name"
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">City</label>
              <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Miami, FL"
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1.5 block">Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500">
                {CATEGORIES.filter(c => c.value !== "all").map(c => <option key={c.value} value={c.value} className="bg-gray-900">{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_free} onChange={e => set("is_free", e.target.checked)} className="w-4 h-4" />
              <span className="text-white text-sm">Free Event</span>
            </label>
            {!form.is_free && (
              <div className="flex-1">
                <input type="number" min="0" step="0.01" value={form.ticket_price} onChange={e => set("ticket_price", e.target.value)} placeholder="Ticket price $"
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600" />
              </div>
            )}
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="music, outdoor, free"
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600" />
          </div>

          {/* Anonymous toggle */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div>
              <p className="text-white text-sm font-medium flex items-center gap-2"><EyeOff className="w-4 h-4 text-gray-400" />Post Anonymously</p>
              <p className="text-gray-500 text-xs">Your name won't appear on the event</p>
            </div>
            <button type="button" onClick={() => set("is_anonymous", !form.is_anonymous)}
              className={`w-11 h-6 rounded-full transition-colors ${form.is_anonymous ? "bg-purple-600" : "bg-white/20"} relative`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_anonymous ? "left-5.5" : "left-0.5"}`} style={{ left: form.is_anonymous ? "1.375rem" : "0.125rem" }} />
            </button>
          </div>
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-white/10 flex-shrink-0 bg-gray-900"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-white/20 text-white" disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600" disabled={submitting || uploading}>
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : <><Calendar className="w-4 h-4 mr-2" />Create Event</>}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EventCard({ event, currentUser, onLike, onSave, onShare, onComment }) {
  const navigate = useNavigate();
  const liked = event.liked_by?.includes(currentUser?.email);
  const saved = event.saved_by?.includes(currentUser?.email);
  const isPast = new Date(event.event_date) < new Date();

  const goToProfile = (e) => {
    e.stopPropagation();
    if (!event.is_anonymous && event.organizer_email) {
      navigate(createPageUrl("UserProfile") + `?email=${encodeURIComponent(event.organizer_email)}`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition group">
      {event.cover_image && (
        <div className="relative h-48 overflow-hidden">
          <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {event.status === "live" && (
            <Badge className="absolute top-3 left-3 bg-red-500 text-white animate-pulse">● LIVE</Badge>
          )}
          {isPast && (
            <Badge className="absolute top-3 left-3 bg-gray-700 text-gray-300">Ended</Badge>
          )}
          <Badge className="absolute top-3 right-3 bg-black/60 text-white border-0">
            {categoryEmoji[event.category] || "✨"} {event.category?.replace("_", " ")}
          </Badge>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">{event.title}</h3>
        {event.description && <p className="text-gray-400 text-sm mb-3 line-clamp-2">{event.description}</p>}

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
            {new Date(event.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <MapPin className="w-4 h-4 text-pink-400 flex-shrink-0" />
              {event.location}{event.city ? `, ${event.city}` : ""}
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Ticket className="w-4 h-4 text-green-400 flex-shrink-0" />
            {event.is_free ? "Free" : `$${event.ticket_price}`}
          </div>
        </div>

        {/* Organizer */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={goToProfile} className={`flex items-center gap-2 ${!event.is_anonymous ? "hover:opacity-80 transition cursor-pointer" : "cursor-default"}`}>
            {event.organizer_photo && !event.is_anonymous ? (
              <img src={event.organizer_photo} className="w-7 h-7 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                {event.is_anonymous ? "?" : (event.organizer_name?.[0] || "?")}
              </div>
            )}
            <span className={`text-sm ${!event.is_anonymous ? "text-purple-300 hover:underline" : "text-gray-500"}`}>
              {event.is_anonymous ? "Anonymous" : (event.organizer_name || "Unknown")}
            </span>
          </button>
          {event.tags?.length > 0 && (
            <div className="flex gap-1 flex-wrap justify-end">
              {event.tags.slice(0, 2).map(tag => <span key={tag} className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">#{tag}</span>)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-3 border-t border-white/10">
          <button onClick={() => onLike(event)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${liked ? "text-red-400 bg-red-500/10" : "text-gray-400 hover:text-red-400 hover:bg-red-500/10"}`}>
            <Heart className={`w-4 h-4 ${liked ? "fill-red-400" : ""}`} />
            <span className="text-xs">{event.likes_count || 0}</span>
          </button>
          <button onClick={() => onComment(event)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition">
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">{event.comments_count || 0}</span>
          </button>
          <button onClick={() => onShare(event)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition">
            <Share2 className="w-4 h-4" />
          </button>
          <button onClick={() => onSave(event)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ml-auto ${saved ? "text-yellow-400 bg-yellow-500/10" : "text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10"}`}>
            <Bookmark className={`w-4 h-4 ${saved ? "fill-yellow-400" : ""}`} />
            <span className="text-xs">{event.saves_count || 0}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [commentingEvent, setCommentingEvent] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-created_date", 100),
  });

  const filtered = events.filter(e => {
    const matchCat = activeCategory === "all" || e.category === activeCategory;
    const matchSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.city?.toLowerCase().includes(search.toLowerCase()) || e.location?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleLike = async (event) => {
    if (!currentUser) { toast.error("Sign in to like events"); return; }
    const liked = event.liked_by?.includes(currentUser.email);
    await base44.entities.Event.update(event.id, {
      likes_count: liked ? Math.max(0, (event.likes_count || 0) - 1) : (event.likes_count || 0) + 1,
      liked_by: liked ? event.liked_by.filter(e => e !== currentUser.email) : [...(event.liked_by || []), currentUser.email]
    });
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const handleSave = async (event) => {
    if (!currentUser) { toast.error("Sign in to save events"); return; }
    const saved = event.saved_by?.includes(currentUser.email);
    await base44.entities.Event.update(event.id, {
      saves_count: saved ? Math.max(0, (event.saves_count || 0) - 1) : (event.saves_count || 0) + 1,
      saved_by: saved ? event.saved_by.filter(e => e !== currentUser.email) : [...(event.saved_by || []), currentUser.email]
    });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    toast.success(saved ? "Removed from saved" : "Event saved!");
  };

  const handleShare = (event) => {
    if (navigator.share) {
      navigator.share({ title: event.title, text: event.description || event.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => toast.success("Link copied!"));
    }
    base44.entities.Event.update(event.id, { shares_count: (event.shares_count || 0) + 1 }).catch(() => {});
  };

  // Adapt event for PostComments (which expects a SocialPost shape with id and comments_count)
  const commentPost = commentingEvent ? {
    id: commentingEvent.id,
    comments_count: commentingEvent.comments_count || 0,
    created_by: commentingEvent.organizer_email
  } : null;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 px-6 py-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Calendar className="w-8 h-8" />Events</h1>
            <p className="text-white/80 mt-1">Discover & share events in your community</p>
          </div>
          {currentUser && (
            <Button onClick={() => setShowCreate(true)} className="bg-white text-purple-700 font-bold hover:bg-white/90">
              <Plus className="w-4 h-4 mr-2" />Create Event
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events, venues, cities..."
            className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500" />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setActiveCategory(cat.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${activeCategory === cat.value ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events grid */}
      <div className="max-w-7xl mx-auto px-4">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No events found</h3>
            <p className="text-gray-400 mb-6">Be the first to create an event!</p>
            {currentUser && <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-purple-600 to-pink-600"><Plus className="w-4 h-4 mr-2" />Create Event</Button>}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(event => (
              <EventCard key={event.id} event={event} currentUser={currentUser}
                onLike={handleLike} onSave={handleSave} onShare={handleShare}
                onComment={(e) => setCommentingEvent(e)} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateEventModal currentUser={currentUser} onClose={() => setShowCreate(false)}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ["events"] })} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {commentingEvent && commentPost && (
          <PostComments
            post={commentPost}
            currentUser={currentUser}
            onClose={() => setCommentingEvent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Search, Tv, User, Briefcase, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const RECENT_KEY = "nav_recent_searches";

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function saveRecent(query) {
  const prev = getRecent().filter(q => q !== query);
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, 5)));
}

export default function NavSearchSuggestions({ query, onClose, onSelect }) {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const recent = getRecent();

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [videos, users] = await Promise.all([
          base44.entities.StreamingContent.list('-views', 50),
          base44.entities.User.list('-created_date', 30),
        ]);
        const term = query.toLowerCase();
        const videoMatches = videos
          .filter(v => v.title?.toLowerCase().includes(term) || v.creator_username?.toLowerCase().includes(term))
          .slice(0, 3)
          .map(v => ({ type: 'video', label: v.title, sub: v.creator_username ? `@${v.creator_username}` : '', id: v.id }));
        const userMatches = users
          .filter(u => u.full_name?.toLowerCase().includes(term) || u.username?.toLowerCase().includes(term))
          .slice(0, 2)
          .map(u => ({ type: 'user', label: u.full_name || u.username, sub: u.username ? `@${u.username}` : '', email: u.email, username: u.username }));
        setSuggestions([...videoMatches, ...userMatches]);
      } catch { setSuggestions([]); }
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item) => {
    saveRecent(query);
    if (item.type === 'video') {
      navigate(createPageUrl("VODPlayer") + `?id=${item.id}`);
    } else if (item.type === 'user') {
      navigate(createPageUrl("UserProfile") + `?username=${item.username || item.email}`);
    } else {
      navigate(createPageUrl("UniversalSearch") + `?search=${encodeURIComponent(item.label)}`);
    }
    onClose();
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    saveRecent(query.trim());
    navigate(createPageUrl("UniversalSearch") + `?search=${encodeURIComponent(query.trim())}`);
    onClose();
  };

  const show = query.length >= 2 ? suggestions.length > 0 || loading : recent.length > 0;
  if (!show && query.length >= 2 && !loading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-[200]"
      >
        {/* Loading */}
        {loading && (
          <div className="px-4 py-3 text-gray-400 text-sm flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            Searching...
          </div>
        )}

        {/* Suggestions */}
        {!loading && query.length >= 2 && suggestions.length > 0 && (
          <div>
            <p className="px-4 pt-3 pb-1 text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Suggestions</p>
            {suggestions.map((item, i) => (
              <button
                key={i}
                onClick={() => handleSelect(item)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  {item.type === 'video' ? <Tv className="w-3.5 h-3.5 text-purple-400" /> :
                   item.type === 'user' ? <User className="w-3.5 h-3.5 text-blue-400" /> :
                   <Briefcase className="w-3.5 h-3.5 text-green-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{item.label}</p>
                  {item.sub && <p className="text-gray-500 text-xs">{item.sub}</p>}
                </div>
                <span className="text-[10px] text-gray-600 uppercase">{item.type}</span>
              </button>
            ))}
          </div>
        )}

        {/* Recent searches */}
        {!loading && query.length < 2 && recent.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Recent</p>
              <button
                onClick={() => { localStorage.removeItem(RECENT_KEY); onSelect?.(); }}
                className="text-[11px] text-gray-500 hover:text-white transition"
              >
                Clear
              </button>
            </div>
            {recent.map((q, i) => (
              <button
                key={i}
                onClick={() => { navigate(createPageUrl("UniversalSearch") + `?search=${encodeURIComponent(q)}`); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition text-left"
              >
                <Clock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="text-gray-300 text-sm flex-1 truncate">{q}</span>
              </button>
            ))}
          </div>
        )}

        {/* Go to full search */}
        {query.length >= 2 && (
          <button
            onClick={handleSearch}
            className="w-full flex items-center gap-3 px-4 py-3 border-t border-white/10 hover:bg-purple-600/20 transition text-left"
          >
            <Search className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-purple-300 text-sm">Search all results for <strong className="text-white">&ldquo;{query}&rdquo;</strong></span>
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
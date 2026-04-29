import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Heart, MessageCircle, Share2, MoreHorizontal, Bookmark, Volume2 } from "lucide-react";

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80";

const ctaLabel = (cta) => cta?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Learn More";

// ── Feed Ad ──────────────────────────────────────────────────────────────────
function FeedAdPreview({ form }) {
  const image = form.media_urls?.[0] || PLACEHOLDER_IMAGE;
  const headline = form.headline || "Your headline here";
  const description = form.description || "Your description will appear here. Make it compelling!";
  const domain = form.destination_url
    ? form.destination_url.replace(/https?:\/\/(www\.)?/, "").split("/")[0]
    : "yoursite.com";

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden border border-white/10 w-full max-w-[320px] mx-auto shadow-xl">
      {/* Post header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
            PS
          </div>
          <div>
            <p className="text-white text-xs font-semibold leading-none">PlaySoFlo</p>
            <p className="text-gray-400 text-[10px] leading-none mt-0.5">Sponsored</p>
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-gray-400" />
      </div>

      {/* Image */}
      <div className="relative w-full aspect-square bg-gray-800">
        <img src={image} alt="Ad preview" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Actions */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-gray-300" />
          <MessageCircle className="w-5 h-5 text-gray-300" />
          <Share2 className="w-5 h-5 text-gray-300" />
        </div>
        <Bookmark className="w-5 h-5 text-gray-300" />
      </div>

      {/* Ad copy */}
      <div className="px-3 pb-3 space-y-1">
        <p className="text-white text-xs font-bold line-clamp-1">{headline}</p>
        <p className="text-gray-400 text-[11px] line-clamp-2 leading-relaxed">{description}</p>
      </div>

      {/* CTA bar */}
      <div className="mx-3 mb-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-[10px]">{domain}</p>
          <p className="text-white text-xs font-semibold line-clamp-1">{headline}</p>
        </div>
        <button className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition">
          {ctaLabel(form.call_to_action)}
        </button>
      </div>
    </div>
  );
}

// ── Story Ad ─────────────────────────────────────────────────────────────────
function StoryAdPreview({ form }) {
  const image = form.media_urls?.[0] || PLACEHOLDER_IMAGE;
  const headline = form.headline || "Your headline here";
  const description = form.description || "Your description will appear here.";

  return (
    <div className="relative mx-auto rounded-2xl overflow-hidden shadow-xl border border-white/10"
      style={{ width: 180, height: 320 }}>
      <img src={image} alt="Story preview" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

      {/* Progress bar */}
      <div className="absolute top-3 left-3 right-3 h-0.5 bg-white/30 rounded-full overflow-hidden">
        <div className="h-full w-3/5 bg-white rounded-full" />
      </div>

      {/* Top bar */}
      <div className="absolute top-6 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[8px] font-bold border border-white/30">
            PS
          </div>
          <div>
            <p className="text-white text-[9px] font-semibold leading-none">PlaySoFlo</p>
            <p className="text-gray-300 text-[8px]">Sponsored</p>
          </div>
        </div>
        <Volume2 className="w-3.5 h-3.5 text-white/70" />
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
        <p className="text-white text-xs font-bold drop-shadow-lg line-clamp-1">{headline}</p>
        <p className="text-gray-200 text-[10px] line-clamp-2 leading-relaxed">{description}</p>
        <button className="w-full bg-white text-gray-900 text-[11px] font-bold py-1.5 rounded-lg">
          {ctaLabel(form.call_to_action)}
        </button>
      </div>
    </div>
  );
}

// ── Banner Ad ─────────────────────────────────────────────────────────────────
function BannerAdPreview({ form }) {
  const image = form.media_urls?.[0] || PLACEHOLDER_IMAGE;
  const headline = form.headline || "Your headline here";
  const description = form.description || "Tap to learn more";

  return (
    <div className="w-full max-w-[320px] mx-auto space-y-1">
      {/* Mock phone top bar context */}
      <div className="flex items-center gap-2 px-1 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
        <div className="flex-1 h-1 bg-gray-700 rounded-full" />
        <p className="text-gray-500 text-[9px]">home feed</p>
      </div>

      {/* Banner */}
      <div className="relative w-full rounded-xl overflow-hidden border border-purple-500/30 shadow-lg shadow-purple-500/10"
        style={{ height: 80 }}>
        <img src={image} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-between px-3">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-[9px] text-gray-300 leading-none mb-0.5">Sponsored · PlaySoFlo</p>
            <p className="text-white text-xs font-bold line-clamp-1">{headline}</p>
            <p className="text-gray-300 text-[10px] line-clamp-1 mt-0.5">{description}</p>
          </div>
          <button className="flex-shrink-0 bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap">
            {ctaLabel(form.call_to_action)}
          </button>
        </div>
        {/* Sponsored badge */}
        <div className="absolute top-1.5 right-2 bg-black/60 rounded px-1 py-0.5">
          <p className="text-[8px] text-gray-300">Ad</p>
        </div>
      </div>

      {/* Mock content below to show context */}
      <div className="space-y-1.5 opacity-30 pt-1">
        {[70, 90, 55].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-700" />
            <div className="space-y-1 flex-1">
              <div className="h-1.5 bg-gray-700 rounded-full" style={{ width: `${w}%` }} />
              <div className="h-1 bg-gray-800 rounded-full" style={{ width: `${w - 20}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main AdPreview ────────────────────────────────────────────────────────────
const TABS = [
  { id: "feed",    label: "📰 Feed" },
  { id: "stories", label: "🔮 Story" },
  { id: "banner",  label: "🎯 Banner" },
];

export default function AdPreview({ form }) {
  const [activeTab, setActiveTab] = useState("feed");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">Live Preview</h3>
        <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full font-medium animate-pulse">● Live</span>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === tab.id
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {activeTab === "feed" && <FeedAdPreview form={form} />}
            {activeTab === "stories" && <StoryAdPreview form={form} />}
            {activeTab === "banner" && <BannerAdPreview form={form} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="text-center text-gray-500 text-[10px] mt-3">
        Preview updates as you type ↑
      </p>
    </div>
  );
}
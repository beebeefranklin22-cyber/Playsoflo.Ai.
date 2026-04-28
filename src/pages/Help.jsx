import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Play, BookOpen, ChevronRight, Filter, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const CATEGORY_INFO = {
  fan_pool: { label: "Fan Pool", icon: "👥", color: "from-purple-500 to-pink-500" },
  inventory: { label: "Inventory", icon: "📦", color: "from-blue-500 to-cyan-500" },
  creator_channel: { label: "Creator Channel", icon: "🎬", color: "from-yellow-500 to-orange-500" },
  marketplace: { label: "Marketplace", icon: "🛍️", color: "from-green-500 to-emerald-500" },
  delivery: { label: "Delivery", icon: "🚚", color: "from-red-500 to-pink-500" },
  travel: { label: "Travel", icon: "✈️", color: "from-indigo-500 to-purple-500" },
  streaming: { label: "Streaming", icon: "📺", color: "from-red-500 to-rose-500" },
  music: { label: "Music", icon: "🎵", color: "from-pink-500 to-rose-500" },
  social: { label: "Social", icon: "👋", color: "from-blue-500 to-purple-500" },
  wallet: { label: "Wallet", icon: "💰", color: "from-green-500 to-teal-500" },
  general: { label: "General", icon: "❓", color: "from-gray-500 to-slate-500" },
};

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [expandedGuide, setExpandedGuide] = useState(null);

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ["help-guides"],
    queryFn: async () => {
      try {
        const result = await base44.entities.HelpGuide.list("-order", 100);
        return result.filter(g => g.is_active !== false);
      } catch {
        toast.error("Failed to load guides");
        return [];
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 300000,
  });

  const filteredGuides = useMemo(() => {
    return guides.filter(guide => {
      const matchesSearch = !searchQuery || 
        guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = !selectedCategory || guide.category === selectedCategory;
      const matchesDifficulty = !selectedDifficulty || guide.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [guides, searchQuery, selectedCategory, selectedDifficulty]);

  const categories = Object.keys(CATEGORY_INFO);
  const difficulties = ["beginner", "intermediate", "advanced"];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-16 z-20 glass-effect border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-white mb-2">Help & Tutorials</h1>
          <p className="text-gray-400">Learn how to use PlaySoFlo's features with step-by-step guides and video tutorials</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides..."
            className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>

        {/* Filter Buttons */}
        <div className="space-y-2">
          {/* Category Filter */}
          <div>
            <p className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Categories
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  !selectedCategory
                    ? "bg-purple-600 text-white"
                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? "bg-purple-600 text-white"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                >
                  <span>{CATEGORY_INFO[cat].icon}</span>
                  {CATEGORY_INFO[cat].label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div>
            <p className="text-white text-sm font-semibold mb-2">Difficulty</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedDifficulty(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  !selectedDifficulty
                    ? "bg-purple-600 text-white"
                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                }`}
              >
                All
              </button>
              {difficulties.map(diff => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(selectedDifficulty === diff ? null : diff)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition capitalize ${
                    selectedDifficulty === diff
                      ? "bg-purple-600 text-white"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchQuery || selectedCategory || selectedDifficulty) && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Showing {filteredGuides.length} results</span>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory(null);
                setSelectedDifficulty(null);
              }}
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Guides Grid */}
      <div className="max-w-4xl mx-auto px-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredGuides.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No guides found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredGuides.map((guide, idx) => {
              const categoryInfo = CATEGORY_INFO[guide.category];
              const isExpanded = expandedGuide === guide.id;
              
              return (
                <motion.div
                  key={guide.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition"
                >
                  {/* Guide Header */}
                  <button
                    onClick={() => setExpandedGuide(isExpanded ? null : guide.id)}
                    className="w-full p-4 flex items-start justify-between hover:bg-white/5 transition text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{categoryInfo.icon}</span>
                        <div>
                          <h3 className="text-white font-bold text-lg">{guide.title}</h3>
                          <p className="text-gray-400 text-sm">{categoryInfo.label}</p>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{guide.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${categoryInfo.color} text-white font-medium capitalize`}>
                          {guide.difficulty}
                        </span>
                        {guide.video_url && (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300 flex items-center gap-1">
                            <Play className="w-3 h-3" /> Video
                          </span>
                        )}
                        {guide.steps?.length > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                            {guide.steps.length} steps
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 ml-4 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-white/10 p-6 space-y-6"
                    >
                      {/* Video */}
                      {guide.video_url && (
                        <div>
                          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <Play className="w-4 h-4 text-red-400" /> Video Tutorial
                          </h4>
                          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
                            {guide.video_url.includes("youtube") ? (
                              <iframe
                                src={guide.video_url}
                                className="w-full h-full"
                                allowFullScreen
                              />
                            ) : (
                              <video
                                src={guide.video_url}
                                controls
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Steps */}
                      {guide.steps?.length > 0 && (
                        <div>
                          <h4 className="text-white font-semibold mb-4">Step-by-Step Guide</h4>
                          <div className="space-y-4">
                            {guide.steps.map((step, stepIdx) => (
                              <div key={stepIdx} className="flex gap-4">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                                    {step.step_number || stepIdx + 1}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <h5 className="text-white font-semibold mb-1">{step.title}</h5>
                                  <p className="text-gray-400 text-sm mb-2">{step.description}</p>
                                  {step.image_url && (
                                    <img
                                      src={step.image_url}
                                      alt={step.title}
                                      className="w-full rounded-lg max-h-48 object-cover"
                                    />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rich Content */}
                      {guide.content && (
                        <div>
                          <h4 className="text-white font-semibold mb-3">Guide Content</h4>
                          <div className="prose prose-invert max-w-none text-gray-300 text-sm">
                            {guide.content}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {guide.tags?.length > 0 && (
                        <div>
                          <p className="text-gray-400 text-xs font-semibold mb-2">Tags</p>
                          <div className="flex flex-wrap gap-2">
                            {guide.tags.map((tag, i) => (
                              <span key={i} className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded-full">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
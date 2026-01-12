import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Play, ChevronLeft, Tv, Gamepad2, Music, Radio,
  TrendingUp, Clock, Users, Sparkles, Film
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

const categories = [
  { id: "all", label: "All", icon: Tv },
  { id: "movies", label: "Movies", icon: Film },
  { id: "sports", label: "Sports", icon: TrendingUp },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "entertainment", label: "Shows", icon: Play },
  { id: "music", label: "Music", icon: Music },
  { id: "betting", label: "Betting", icon: TrendingUp },
];

const movieTypes = [
  { id: "all_movies", label: "All Movies" },
  { id: "action", label: "Action" },
  { id: "comedy", label: "Comedy" },
  { id: "drama", label: "Drama" },
  { id: "sci-fi", label: "Sci-Fi" },
  { id: "thriller", label: "Thriller" },
  { id: "horror", label: "Horror" },
  { id: "romance", label: "Romance" },
];

export default function Streaming() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMovieType, setSelectedMovieType] = useState("all_movies");

  const { data: content = [], isLoading } = useQuery({
    queryKey: ['streaming-content'],
    queryFn: () => base44.entities.StreamingContent.list(),
    initialData: []
  });

  const filteredContent = (() => {
    let filtered = content;
    
    // Filter by main category
    if (selectedCategory === "movies") {
      filtered = content.filter(item => item.type === "movie");
    } else if (selectedCategory !== "all") {
      filtered = content.filter(item => item.category === selectedCategory);
    }
    
    // Filter movies by subcategory if applicable
    if (selectedCategory === "movies" && selectedMovieType !== "all_movies") {
      filtered = filtered.filter(item => 
        item.description?.toLowerCase().includes(selectedMovieType) ||
        item.title?.toLowerCase().includes(selectedMovieType)
      );
    }
    
    return filtered;
  })();

  const liveContent = content.filter(item => item.is_live);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-red-950 to-gray-950 pb-20">
      <div className="relative h-64 flex items-end">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/50 to-transparent" />
        <div className="absolute top-6 left-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 backdrop-blur-xl rounded-full hover:bg-white/20 transition border border-white/20"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        </div>
        <div className="relative z-10 w-full px-6 pb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Streaming
          </h1>
          <p className="text-gray-300 text-lg">
            Watch live sports, shows, gaming & more
          </p>
        </div>
      </div>

      {/* Content Discovery Section */}
      <div className="px-6 mb-8">
        <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Discover Content</h2>
              <p className="text-gray-300">Personalized recommendations based on your interests</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate(createPageUrl("Gaming"))}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Gamepad2 className="w-4 h-4 mr-2" />
                Play Games
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("PersonalizedFeed"))}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Explore
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-white font-bold text-lg">2.4M</p>
              <p className="text-gray-400 text-xs">Trending Now</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-white font-bold text-lg">850K</p>
              <p className="text-gray-400 text-xs">Creators</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <Play className="w-8 h-8 text-pink-400 mx-auto mb-2" />
              <p className="text-white font-bold text-lg">15K</p>
              <p className="text-gray-400 text-xs">Live Streams</p>
            </div>
          </div>
        </div>
      </div>

      {liveContent.length > 0 && (
        <div className="px-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Radio className="w-6 h-6 text-red-500 animate-pulse" />
            Live Now
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveContent.slice(0, 2).map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative h-48 rounded-2xl overflow-hidden cursor-pointer group"
              >
                <img 
                  src={item.thumbnail_url} 
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                
                <div className="absolute top-4 left-4 px-3 py-1 bg-red-500 rounded-full text-xs font-bold text-white flex items-center gap-1 animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  LIVE
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-4 text-gray-300 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      45.2K watching
                    </div>
                    {item.betting_available && (
                      <span className="px-2 py-1 bg-yellow-500/20 rounded text-yellow-300 text-xs font-bold">
                        Bet Live
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 overflow-x-auto pb-4 hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                if (cat.id !== "movies") setSelectedMovieType("all_movies");
              }}
              className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full font-medium transition ${
                selectedCategory === cat.id
                  ? "bg-red-500 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Movie Subcategories */}
        {selectedCategory === "movies" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 hide-scrollbar mt-4">
            {movieTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedMovieType(type.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedMovieType === type.id
                    ? "bg-purple-500 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-6">
        <h2 className="text-2xl font-bold text-white mb-4">Browse Content</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredContent.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-gray-900">
                  <img 
                    src={item.thumbnail_url} 
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 bg-red-500/90 rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>

                  {/* Add tipping on cards */}
                  <div className="absolute right-2 top-2 z-10"> {/* Added z-10 for layering */}
                    <Button
                      size="sm"
                      className="bg-yellow-500 hover:bg-yellow-600 text-black"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const amount = prompt('Tip amount in USD (demo)');
                        if (!amount) return;
                        try {
                          await base44.entities.TipTransaction.create({
                            creator_email: item.creator_email || item.created_by || "creator@example.com",
                            amount_usd: parseFloat(amount),
                            content_id: String(item.id)
                          });
                          alert('Tip sent!');
                        } catch (error) {
                          alert('Error sending tip');
                        }
                      }}
                    >
                      Tip
                    </Button>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                    <h3 className="text-white font-bold mb-1 line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-300 text-xs">
                      {item.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.duration}
                        </div>
                      )}
                      {item.rating && (
                        <span>★ {item.rating}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredContent.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tv className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No content found</h3>
            <p className="text-gray-400">Try selecting a different category</p>
          </div>
        )}
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
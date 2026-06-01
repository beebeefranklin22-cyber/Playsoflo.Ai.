import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Star, Play, X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const TMDB_GENRES = {
  movie: [
    { id: 28, name: "Action" }, { id: 12, name: "Adventure" }, { id: 16, name: "Animation" },
    { id: 35, name: "Comedy" }, { id: 80, name: "Crime" }, { id: 99, name: "Documentary" },
    { id: 18, name: "Drama" }, { id: 10751, name: "Family" }, { id: 14, name: "Fantasy" },
    { id: 36, name: "History" }, { id: 27, name: "Horror" }, { id: 10402, name: "Music" },
    { id: 9648, name: "Mystery" }, { id: 10749, name: "Romance" }, { id: 878, name: "Sci-Fi" },
    { id: 53, name: "Thriller" }, { id: 10752, name: "War" }, { id: 37, name: "Western" },
  ],
  tv: [
    { id: 10759, name: "Action" }, { id: 16, name: "Animation" }, { id: 35, name: "Comedy" },
    { id: 80, name: "Crime" }, { id: 99, name: "Documentary" }, { id: 18, name: "Drama" },
    { id: 10751, name: "Family" }, { id: 10762, name: "Kids" }, { id: 9648, name: "Mystery" },
    { id: 10763, name: "News" }, { id: 10764, name: "Reality" }, { id: 10765, name: "Sci-Fi" },
    { id: 10766, name: "Soap" }, { id: 10768, name: "War" }, { id: 37, name: "Western" },
  ],
};

export default function TMDBMovieBrowser({ onClose }) {
  const [contentType, setContentType] = useState("movie");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [itemDetails, setItemDetails] = useState(null);

  const genres = TMDB_GENRES[contentType] || [];

  const { data, isLoading } = useQuery({
    queryKey: ['tmdb-content', contentType, searchQuery, selectedGenre, page],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('fetchTMDBContent', {
        type: contentType,
        page,
        query: searchQuery,
        genre_id: searchQuery ? '' : selectedGenre
      });
      return data;
    }
  });

  const handleGetDetails = async (item) => {
    setSelectedItem(item);
    setLoadingDetails(true);
    try {
      const { data } = await base44.functions.invoke('getTMDBDetails', {
        tmdb_id: item.tmdb_id,
        type: contentType
      });
      setItemDetails(data);
    } catch (error) {
      toast.error("Failed to load details");
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl overflow-y-auto"
      style={{ paddingTop: 'calc(4rem + var(--safe-area-top, 0px))', paddingBottom: 'calc(5rem + var(--safe-area-bottom, 0px))' }}
    >
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md -mx-4 px-4 py-3 mb-4 flex items-center justify-between">
            <h2 className="text-xl sm:text-3xl font-bold text-white">Browse Movies & Shows</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => { setContentType("movie"); setSelectedGenre(""); setPage(1); }}
                className={contentType === "movie" ? "bg-purple-600" : "bg-white/10"}
              >
                Movies
              </Button>
              <Button
                onClick={() => { setContentType("tv"); setSelectedGenre(""); setPage(1); }}
                className={contentType === "tv" ? "bg-purple-600" : "bg-white/10"}
              >
                TV Shows
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder={`Search ${contentType === 'movie' ? 'movies' : 'TV shows'}...`}
                className="pl-12 bg-white/10 border-white/20 text-white h-12"
              />
            </div>

            {/* Genre Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ touchAction: 'pan-x' }}>
              <button
                onClick={() => { setSelectedGenre(""); setPage(1); }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  !selectedGenre ? "bg-purple-600 text-white" : "bg-white/10 text-gray-400 hover:text-white"
                }`}
              >
                All
              </button>
              {genres.map((g) => (
                <button
                  key={g.id}
                  onClick={() => { setSelectedGenre(String(g.id)); setPage(1); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    selectedGenre === String(g.id) ? "bg-purple-600 text-white" : "bg-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {/* Results Grid */}
          {isLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-400 mt-4">Loading content...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                {data?.results?.map((item) => (
                  <motion.div
                    key={item.tmdb_id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group cursor-pointer"
                    onClick={() => handleGetDetails(item)}
                  >
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-900">
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>

                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 px-2 py-1 rounded">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-white text-xs font-bold">{item.rating?.toFixed(1)}</span>
                      </div>

                      <div className="absolute bottom-0 inset-x-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                        <h3 className="text-white font-bold text-sm line-clamp-2">{item.title}</h3>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {data && data.total_pages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                    className="bg-white/10"
                  >
                    Previous
                  </Button>
                  <span className="text-white px-4 py-2">
                    Page {page} of {Math.min(data.total_pages, 500)}
                  </span>
                  <Button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= data.total_pages}
                    variant="outline"
                    className="bg-white/10"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => { setSelectedItem(null); setItemDetails(null); }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-gray-900 rounded-3xl overflow-hidden max-h-[75vh] overflow-y-auto"
            >
              {loadingDetails ? (
                <div className="p-20 text-center">
                  <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : itemDetails ? (
                <>
                  {/* Backdrop */}
                  {itemDetails.backdrop_url && (
                    <div className="relative h-64">
                      <img
                        src={itemDetails.backdrop_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex gap-6 mb-6">
                      <img
                        src={itemDetails.thumbnail_url}
                        alt={itemDetails.title}
                        className="w-32 h-48 object-cover rounded-xl"
                      />
                      <div className="flex-1">
                        <h2 className="text-3xl font-bold text-white mb-2">{itemDetails.title}</h2>
                        <div className="flex items-center gap-4 text-gray-400 mb-4">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-white font-bold">{itemDetails.rating?.toFixed(1)}</span>
                          </div>
                          {itemDetails.duration && <span>{itemDetails.duration}</span>}
                          {itemDetails.release_date && (
                            <span>{new Date(itemDetails.release_date).getFullYear()}</span>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap mb-4">
                          {itemDetails.genres?.map(genre => (
                            <span key={genre} className="px-3 py-1 bg-purple-600/30 rounded-full text-purple-300 text-sm">
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-300 mb-6">{itemDetails.description}</p>

                    {itemDetails.cast?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-white font-bold mb-2">Cast</h3>
                        <p className="text-gray-400">{itemDetails.cast.join(', ')}</p>
                      </div>
                    )}

                    {/* Watch on streaming services (deep-links) */}
                    <div className="bg-white/5 rounded-xl p-4 mb-4">
                      <h3 className="text-white font-bold mb-3">Watch On</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => window.open(`https://tubitv.com/search/${encodeURIComponent(itemDetails.title)}`, '_blank')}
                          className="bg-[#ff7900] hover:bg-[#ff8c1a] text-black font-bold"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Tubi
                        </Button>
                        <Button
                          onClick={() => window.open(`https://watchplex.tv/search?q=${encodeURIComponent(itemDetails.title)}`, '_blank')}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Watchplex
                        </Button>
                      </div>
                      <p className="text-gray-500 text-xs mt-3">Opens the title on the streaming service to watch.</p>
                    </div>

                    {itemDetails.trailer && (
                      <Button
                        onClick={() => window.open(`https://www.youtube.com/watch?v=${itemDetails.trailer.key}`, '_blank')}
                        className="w-full bg-gradient-to-r from-red-600 to-pink-600 mb-4"
                      >
                        <Play className="w-5 h-5 mr-2" />
                        Watch Trailer
                      </Button>
                    )}

                    <Button
                      onClick={() => window.open(`https://www.themoviedb.org/${contentType}/${itemDetails.tmdb_id}`, '_blank')}
                      variant="outline"
                      className="w-full bg-white/5"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on TMDB
                    </Button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
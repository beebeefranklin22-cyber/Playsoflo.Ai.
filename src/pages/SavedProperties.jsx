import React, { useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Heart, Trash2, MapPin, FolderHeart, Building } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SavedProperties() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeCollection, setActiveCollection] = useState("All");

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: savedProperties = [], isLoading } = useQuery({
    queryKey: ["saved-properties"],
    queryFn: () => base44.entities.SavedProperty.filter({ user_email: currentUser?.email }),
    enabled: !!currentUser,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedProperty.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-properties"] });
      toast.success("Removed from saved");
    },
  });

  const collections = ["All", ...new Set(savedProperties.map(s => s.collection_name).filter(Boolean))];

  const filtered = activeCollection === "All"
    ? savedProperties
    : savedProperties.filter(s => s.collection_name === activeCollection);

  if (!currentUser && !isLoading) {
    return (
      <PageWrapper>
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 flex items-center justify-center">
          <div className="text-center px-4">
            <Heart className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Sign in to see saved properties</h2>
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="mt-4 px-6 py-3 bg-emerald-500 rounded-full text-white font-semibold"
            >
              Sign In
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950">
        <div className="px-4 sm:px-6 pt-8 pb-24">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <FolderHeart className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Saved Properties</h1>
              <p className="text-gray-400 text-sm">{savedProperties.length} propert{savedProperties.length !== 1 ? "ies" : "y"} saved</p>
            </div>
          </div>

          {/* Collection Tabs */}
          {collections.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-6 hide-scrollbar -mx-4 px-4">
              {collections.map((col) => (
                <button
                  key={col}
                  onClick={() => setActiveCollection(col)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                    activeCollection === col
                      ? "bg-emerald-500 text-white"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                >
                  {col}
                  {col !== "All" && (
                    <span className="ml-1.5 text-xs opacity-70">
                      ({savedProperties.filter(s => s.collection_name === col).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Properties Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-white/5 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No saved properties yet</h3>
              <p className="text-gray-400 mb-6">Tap the heart icon on any property to save it here</p>
              <button
                onClick={() => navigate(createPageUrl("RealEstate"))}
                className="px-6 py-3 bg-emerald-500 rounded-full text-white font-semibold hover:bg-emerald-600 transition"
              >
                Browse Properties
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filtered.map((saved, i) => (
                  <motion.div
                    key={saved.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                    className="group bg-gray-900/60 rounded-3xl overflow-hidden border border-white/10 hover:border-emerald-500/30 transition"
                  >
                    <div className="relative h-48">
                      {saved.property_image ? (
                        <img
                          src={saved.property_image}
                          alt={saved.property_title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-emerald-900/40 flex items-center justify-center">
                          <Building className="w-12 h-12 text-emerald-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 bg-emerald-500/80 rounded-full text-xs text-white font-medium">
                          {saved.collection_name}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(saved.id)}
                        className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur rounded-full text-red-400 hover:bg-red-500 hover:text-white transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-bold text-lg mb-1 line-clamp-1">
                        {saved.property_title || "Property"}
                      </h3>
                      {saved.property_location && (
                        <div className="flex items-center gap-1 text-gray-400 text-sm mb-2">
                          <MapPin className="w-3 h-3" />
                          <span className="line-clamp-1">{saved.property_location}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        {saved.property_price && (
                          <p className="text-emerald-400 font-bold">{saved.property_price}</p>
                        )}
                        <button
                          onClick={() => navigate(createPageUrl("RealEstate"))}
                          className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                        >
                          View on map
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </PageWrapper>
  );
}
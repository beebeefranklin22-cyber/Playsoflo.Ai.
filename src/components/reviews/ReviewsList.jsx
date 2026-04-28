import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Filter } from "lucide-react";
import { motion } from "framer-motion";
import ReviewCard from "./ReviewCard";
import RatingDistribution from "./RatingDistribution";

export default function ReviewsList({
  serviceType,
  serviceId,
  currentUser,
  showDistribution = true
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterRating, setFilterRating] = useState(null);
  const [showOnlyVerified, setShowOnlyVerified] = useState(false);

  const { data: reviews = [], refetch } = useQuery({
    queryKey: ["reviews", serviceType, serviceId],
    queryFn: async () => {
      try {
        const result = await base44.entities.Review.filter({
          service_type: serviceType,
          service_id: serviceId,
          status: "approved"
        }, "-created_date");
        return result || [];
      } catch {
        return [];
      }
    },
    refetchOnWindowFocus: false
  });

  const filteredReviews = useMemo(() => {
    let filtered = reviews;

    // Filter by rating
    if (filterRating) {
      filtered = filtered.filter(r => r.rating === filterRating);
    }

    // Filter by verified purchase
    if (showOnlyVerified) {
      filtered = filtered.filter(r => r.verified_purchase);
    }

    // Search by content
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.content.toLowerCase().includes(query) ||
        r.title?.toLowerCase().includes(query) ||
        r.reviewer_name.toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortBy === "helpful") {
      filtered = [...filtered].sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
    } else if (sortBy === "recent") {
      filtered = [...filtered].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    } else if (sortBy === "rating-high") {
      filtered = [...filtered].sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "rating-low") {
      filtered = [...filtered].sort((a, b) => a.rating - b.rating);
    }

    return filtered;
  }, [reviews, searchQuery, sortBy, filterRating, showOnlyVerified]);

  return (
    <div className="space-y-6">
      {/* Rating Distribution */}
      {showDistribution && reviews.length > 0 && (
        <RatingDistribution reviews={reviews} />
      )}

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search reviews..."
            className="w-full pl-12 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition text-sm"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-2">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 transition"
          >
            <option value="recent">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="rating-high">Highest Rated</option>
            <option value="rating-low">Lowest Rated</option>
          </select>

          {[5, 4, 3, 2, 1].map(rating => (
            <button
              key={rating}
              onClick={() => setFilterRating(filterRating === rating ? null : rating)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filterRating === rating
                  ? "bg-yellow-600 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              {rating}★
            </button>
          ))}

          <button
            onClick={() => setShowOnlyVerified(!showOnlyVerified)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              showOnlyVerified
                ? "bg-green-600 text-white"
                : "bg-white/10 text-gray-300 hover:bg-white/20"
            }`}
          >
            Verified Only
          </button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No reviews found</p>
          </div>
        ) : (
          filteredReviews.map((review, idx) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <ReviewCard
                review={review}
                currentUser={currentUser}
                onHelpfulUpdate={() => refetch()}
              />
            </motion.div>
          ))
        )}
      </div>

      {/* Results Count */}
      <p className="text-gray-400 text-sm text-center">
        Showing {filteredReviews.length} of {reviews.length} reviews
      </p>
    </div>
  );
}
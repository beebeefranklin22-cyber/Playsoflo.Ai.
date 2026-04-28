import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Star, ThumbsUp, ThumbsDown, Shield, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ReviewCard({ review, currentUser, onHelpfulUpdate }) {
  const [isHelpful, setIsHelpful] = useState(null);
  const [showProviderResponse, setShowProviderResponse] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleHelpful = async (helpful) => {
    if (!currentUser) {
      toast.error("Sign in to mark reviews as helpful");
      return;
    }

    setLoading(true);
    try {
      const alreadyMarked = review.helpful_by?.includes(currentUser.email);
      let newHelpfulBy = review.helpful_by || [];
      
      if (helpful) {
        if (!alreadyMarked) {
          newHelpfulBy = [...newHelpfulBy, currentUser.email];
        }
      }

      await base44.entities.Review.update(review.id, {
        helpful_count: helpful ? newHelpfulBy.length : review.helpful_count,
        helpful_by: newHelpfulBy
      });

      setIsHelpful(helpful);
      if (onHelpfulUpdate) onHelpfulUpdate();
      toast.success("Thanks for your feedback!");
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const averageCategoryRating = review.category_ratings
    ? Object.values(review.category_ratings).reduce((a, b) => a + b, 0) / Object.keys(review.category_ratings).length
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/5 border rounded-2xl p-4 space-y-3 ${
        review.status === "pending" ? "border-yellow-500/30 opacity-75" : "border-white/10"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <img
            src={review.reviewer_avatar || `https://ui-avatars.com/api/?name=${review.reviewer_name}`}
            alt={review.reviewer_name}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-semibold">{review.reviewer_name}</p>
              {review.verified_purchase && (
                <div className="flex items-center gap-1 bg-green-500/20 px-2 py-0.5 rounded-full">
                  <Shield className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Verified Purchase</span>
                </div>
              )}
              {review.status === "pending" && (
                <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs text-yellow-400 font-medium">Pending Approval</span>
                </div>
              )}
            </div>
            <p className="text-gray-400 text-sm">
              {new Date(review.created_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Title & Content */}
      {review.title && <h4 className="text-white font-semibold">{review.title}</h4>}
      <p className="text-gray-300 text-sm leading-relaxed">{review.content}</p>

      {/* Category Ratings */}
      {review.category_ratings && Object.keys(review.category_ratings).length > 0 && (
        <div className="bg-white/10 rounded-lg p-3 space-y-2">
          <p className="text-gray-400 text-xs font-semibold">Detailed Ratings</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(review.category_ratings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-gray-400 capitalize">{key}</span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < value ? "bg-yellow-400" : "bg-gray-600"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      {review.photos?.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {review.photos.map((photo, idx) => (
            <img
              key={idx}
              src={photo}
              alt={`Review photo ${idx}`}
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
            />
          ))}
        </div>
      )}

      {/* Provider Response */}
      {review.provider_response && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
          <button
            onClick={() => setShowProviderResponse(!showProviderResponse)}
            className="text-purple-300 text-sm font-semibold hover:text-purple-200 transition"
          >
            Provider Response →
          </button>
          {showProviderResponse && (
            <p className="text-gray-300 text-sm mt-2">{review.provider_response}</p>
          )}
        </div>
      )}

      {/* Helpful/Unhelpful */}
      <div className="flex items-center gap-4 pt-2 border-t border-white/10">
        <button
          onClick={() => handleHelpful(true)}
          disabled={loading}
          className={`flex items-center gap-1.5 text-sm transition ${
            isHelpful === true
              ? "text-green-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <ThumbsUp className="w-4 h-4" />
          <span>Helpful ({review.helpful_count || 0})</span>
        </button>
        <button
          onClick={() => handleHelpful(false)}
          disabled={loading}
          className={`flex items-center gap-1.5 text-sm transition ${
            isHelpful === false
              ? "text-red-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <ThumbsDown className="w-4 h-4" />
          <span>Not Helpful ({review.unhelpful_count || 0})</span>
        </button>
      </div>
    </motion.div>
  );
}
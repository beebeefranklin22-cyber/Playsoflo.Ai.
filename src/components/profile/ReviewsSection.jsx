import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Star, ThumbsUp, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import UniversalReviewModal from "../reviews/UniversalReviewModal";

export default function ReviewsSection({ userEmail, userName, isOwnProfile, currentUser }) {
  const queryClient = useQueryClient();
  const [showWriteReview, setShowWriteReview] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['user-reviews', userEmail],
    queryFn: () => base44.entities.UserReview.filter({ reviewed_user_email: userEmail }, '-created_date'),
    enabled: !!userEmail
  });

  const hasReviewed = reviews.some(r => r.reviewer_email === currentUser?.email);

  const helpfulMutation = useMutation({
    mutationFn: (review) => base44.entities.UserReview.update(review.id, {
      helpful_count: (review.helpful_count || 0) + 1
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-reviews', userEmail] })
  });

  // Calculate average ratings
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => Math.round(r.rating) === stars).length,
    percent: reviews.length > 0 ? (reviews.filter(r => Math.round(r.rating) === stars).length / reviews.length) * 100 : 0
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Reviews</h3>
        {!isOwnProfile && currentUser && !hasReviewed && (
          <Button onClick={() => setShowWriteReview(true)} className="bg-purple-600 hover:bg-purple-700">
            Write Review
          </Button>
        )}
      </div>

      {/* Rating Summary */}
      {reviews.length > 0 && (
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="text-center md:text-left">
              <div className="text-5xl font-bold text-white mb-2">{avgRating}</div>
              <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    className={`w-5 h-5 ${star <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} 
                  />
                ))}
              </div>
              <p className="text-gray-400 text-sm">{reviews.length} reviews</p>
            </div>

            <div className="flex-1 space-y-2">
              {ratingDistribution.map(({ stars, count, percent }) => (
                <div key={stars} className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm w-8">{stars} ★</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-gray-500 text-sm w-8">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
          <Star className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold overflow-hidden">
                  {review.reviewer_photo ? (
                    <img src={review.reviewer_photo} className="w-full h-full object-cover" />
                  ) : (
                    review.reviewer_name?.[0] || "U"
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium">{review.reviewer_name || "Anonymous"}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star 
                              key={star} 
                              className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-gray-500 text-xs">
                          {formatDistanceToNow(new Date(review.created_date), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    {review.verified_transaction && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                        Verified
                      </span>
                    )}
                  </div>

                  {review.review_text && (
                    <p className="text-gray-300 text-sm mb-3">{review.review_text}</p>
                  )}

                  {review.categories && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {Object.entries(review.categories).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 capitalize">{key}</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star 
                                key={star} 
                                className={`w-3 h-3 ${star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => helpfulMutation.mutate(review)}
                    className="flex items-center gap-1 text-gray-500 hover:text-purple-400 text-xs transition"
                  >
                    <ThumbsUp className="w-3 h-3" />
                    Helpful ({review.helpful_count || 0})
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Write Review Modal -- this used to be a self-contained modal here
          that created a UserReview with no verified_transaction flag, no
          booking linkage, and no notification to the reviewed user (a
          weaker, parallel write path to the one every other review flow in
          the app uses). Reuse UniversalReviewModal instead so this profile
          produces the same shape of review as everywhere else. */}
      {showWriteReview && (
        <UniversalReviewModal
          reviewedUserEmail={userEmail}
          reviewedUserName={userName}
          reviewType="service"
          onClose={() => setShowWriteReview(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['user-reviews', userEmail] })}
        />
      )}
    </div>
  );
}
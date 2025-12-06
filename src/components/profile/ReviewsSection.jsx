import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ThumbsUp, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function ReviewsSection({ userEmail, isOwnProfile, currentUser }) {
  const queryClient = useQueryClient();
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    review_text: "",
    categories: { quality: 5, communication: 5, professionalism: 5, value: 5 }
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['user-reviews', userEmail],
    queryFn: () => base44.entities.UserReview.filter({ reviewed_user_email: userEmail }, '-created_date'),
    enabled: !!userEmail
  });

  const hasReviewed = reviews.some(r => r.reviewer_email === currentUser?.email);

  const createReviewMutation = useMutation({
    mutationFn: () => base44.entities.UserReview.create({
      ...newReview,
      reviewed_user_email: userEmail,
      reviewer_email: currentUser.email,
      reviewer_name: currentUser.full_name,
      reviewer_photo: currentUser.profile_photo
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-reviews', userEmail] });
      setShowWriteReview(false);
      setNewReview({ rating: 5, review_text: "", categories: { quality: 5, communication: 5, professionalism: 5, value: 5 } });
      toast.success('Review submitted!');
    }
  });

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

      {/* Write Review Modal */}
      <AnimatePresence>
        {showWriteReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowWriteReview(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Write a Review</h3>
                <button onClick={() => setShowWriteReview(false)}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Overall Rating */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Overall Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                        className="p-1"
                      >
                        <Star 
                          className={`w-8 h-8 transition ${
                            star <= newReview.rating 
                              ? 'text-yellow-400 fill-yellow-400' 
                              : 'text-gray-600 hover:text-yellow-400'
                          }`} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Ratings */}
                <div className="space-y-3">
                  {['quality', 'communication', 'professionalism', 'value'].map(category => (
                    <div key={category}>
                      <label className="text-gray-400 text-sm mb-1 block capitalize">{category}</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => setNewReview(prev => ({
                              ...prev,
                              categories: { ...prev.categories, [category]: star }
                            }))}
                          >
                            <Star 
                              className={`w-5 h-5 transition ${
                                star <= newReview.categories[category] 
                                  ? 'text-yellow-400 fill-yellow-400' 
                                  : 'text-gray-600 hover:text-yellow-400'
                              }`} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <Textarea
                  value={newReview.review_text}
                  onChange={(e) => setNewReview(prev => ({ ...prev, review_text: e.target.value }))}
                  placeholder="Share your experience..."
                  className="bg-white/10 border-white/20 text-white"
                  rows={4}
                />

                <Button
                  onClick={() => createReviewMutation.mutate()}
                  disabled={createReviewMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {createReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Review'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
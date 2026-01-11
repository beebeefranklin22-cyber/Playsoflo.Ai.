import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Star, ThumbsUp, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function ReviewsList({ 
  userEmail, 
  reviewType,
  propertyId,
  limit = 10 
}) {
  const [showAll, setShowAll] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', userEmail, reviewType, propertyId],
    queryFn: async () => {
      const filters = { reviewed_user_email: userEmail };
      if (reviewType) filters.review_type = reviewType;
      if (propertyId) filters.property_id = propertyId;
      
      return await base44.entities.UserReview.filter(filters, '-created_date', 50);
    },
    initialData: []
  });

  const displayedReviews = showAll ? reviews : reviews.slice(0, limit);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 : 0
  }));

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {reviews.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center md:border-r border-white/10">
                <div className="text-5xl font-bold text-white mb-2">{averageRating}</div>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(averageRating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-gray-400 text-sm">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
              </div>

              <div className="space-y-2">
                {ratingDistribution.map(({ rating, count, percentage }) => (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-12">
                      <span className="text-white text-sm">{rating}</span>
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-8">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {displayedReviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {review.reviewer_photo ? (
                    <img
                      src={review.reviewer_photo}
                      alt={review.reviewer_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {review.reviewer_name?.[0] || 'U'}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white font-semibold">{review.reviewer_name}</p>
                        <p className="text-gray-400 text-sm">
                          {new Date(review.created_date).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {review.review_text && (
                      <p className="text-gray-300 mb-3">{review.review_text}</p>
                    )}

                    {review.categories && Object.keys(review.categories).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {Object.entries(review.categories).map(([category, rating]) => (
                          <div
                            key={category}
                            className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300"
                          >
                            {category.replace('_', ' ')}: {rating}/5
                          </div>
                        ))}
                      </div>
                    )}

                    {review.verified_transaction && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full text-xs text-green-400">
                        ✓ Verified booking
                      </div>
                    )}

                    {review.host_response && (
                      <div className="mt-4 p-4 bg-white/5 rounded-xl border-l-2 border-purple-500">
                        <p className="text-gray-400 text-sm mb-1">Response from host</p>
                        <p className="text-gray-300 text-sm">{review.host_response}</p>
                        <p className="text-gray-500 text-xs mt-2">
                          {new Date(review.host_response_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {reviews.length > limit && !showAll && (
        <Button
          onClick={() => setShowAll(true)}
          variant="outline"
          className="w-full bg-white/5 border-white/20"
        >
          Show all {reviews.length} reviews
        </Button>
      )}

      {reviews.length === 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <MessageCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No reviews yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
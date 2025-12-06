import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ThumbsUp, Verified } from "lucide-react";
import { motion } from "framer-motion";

export default function ReviewsList({ providerEmail }) {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['provider-reviews', providerEmail],
    queryFn: async () => {
      return await base44.entities.UserReview.filter({
        reviewed_user_email: providerEmail
      }, '-created_date');
    },
    enabled: !!providerEmail
  });

  // Calculate stats
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0
  }));

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <p className="text-gray-400 text-center">Loading reviews...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">{avgRating}</div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(avgRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-400 text-sm">{reviews.length} reviews</p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {ratingDistribution.map(({ star, count, percentage }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm w-8">{star}★</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-sm w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Star className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400">No reviews yet</p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review, idx) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="bg-white/5 border-white/10 hover:border-purple-500/30 transition">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Reviewer Avatar */}
                    <div className="flex-shrink-0">
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
                    </div>

                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-semibold">{review.reviewer_name}</h4>
                            {review.verified_transaction && (
                              <Badge className="bg-green-500/20 text-green-300 border-0">
                                <Verified className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs">
                            {new Date(review.created_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Review Text */}
                      <p className="text-gray-300 mb-3">{review.review_text}</p>

                      {/* Category Ratings */}
                      {review.categories && (
                        <div className="flex flex-wrap gap-3 mb-3">
                          {Object.entries(review.categories).map(([key, value]) => (
                            value > 0 && (
                              <div key={key} className="flex items-center gap-2 text-xs">
                                <span className="text-gray-400 capitalize">{key}:</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-3 h-3 ${
                                        star <= value
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-600'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      )}

                      {/* Helpful Count */}
                      {review.helpful_count > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <ThumbsUp className="w-4 h-4" />
                          <span>{review.helpful_count} people found this helpful</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
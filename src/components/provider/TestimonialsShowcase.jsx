import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";

export default function TestimonialsShowcase({ reviews = [] }) {
  if (reviews.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 text-center">
          <Quote className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No testimonials yet</p>
        </CardContent>
      </Card>
    );
  }

  const featuredReviews = reviews
    .filter(r => r.rating >= 4)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {featuredReviews.map((review, idx) => (
        <motion.div
          key={review.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Card className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border-purple-500/20 h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
              <Quote className="w-8 h-8 text-purple-400/30 mb-2" />
              <p className="text-gray-300 text-sm mb-4 line-clamp-4">
                {review.review_text}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  {review.reviewer_name?.[0] || review.reviewer_email?.[0] || 'U'}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {review.reviewer_name || 'Anonymous'}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {new Date(review.created_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
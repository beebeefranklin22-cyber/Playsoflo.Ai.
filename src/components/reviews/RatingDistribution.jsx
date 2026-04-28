import React from "react";
import { Star } from "lucide-react";

export default function RatingDistribution({ reviews = [] }) {
  const distribution = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  };

  const total = reviews.length;
  const average = total > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
      {/* Average Rating */}
      <div className="flex items-start gap-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-white mb-1">{average}</div>
          <div className="flex items-center gap-1 justify-center mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.round(average)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-600"
                }`}
              />
            ))}
          </div>
          <p className="text-gray-400 text-sm">{total} reviews</p>
        </div>

        {/* Distribution Bars */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} className="flex items-center gap-3">
              <span className="text-gray-400 text-sm w-12">{star} star</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600"
                  style={{ width: `${total > 0 ? (distribution[star] / total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-gray-400 text-sm w-8 text-right">{distribution[star]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
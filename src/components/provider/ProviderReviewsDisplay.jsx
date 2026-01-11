import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Star, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProviderReviewsDisplay({ providerEmail, showDetailed = false }) {
  const { data: reviews = [] } = useQuery({
    queryKey: ['provider-reviews', providerEmail],
    queryFn: async () => {
      return await base44.entities.UserReview.filter({ 
        reviewed_user_email: providerEmail 
      }, '-created_date', 100);
    },
    initialData: []
  });

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const categoryAverages = {};
  if (reviews.length > 0) {
    const categoryCounts = {};
    reviews.forEach(review => {
      if (review.categories) {
        Object.entries(review.categories).forEach(([cat, rating]) => {
          if (!categoryAverages[cat]) {
            categoryAverages[cat] = 0;
            categoryCounts[cat] = 0;
          }
          categoryAverages[cat] += rating;
          categoryCounts[cat]++;
        });
      }
    });
    
    Object.keys(categoryAverages).forEach(cat => {
      categoryAverages[cat] = (categoryAverages[cat] / categoryCounts[cat]).toFixed(1);
    });
  }

  if (!showDetailed) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-white font-semibold">{averageRating}</span>
        </div>
        <span className="text-gray-400 text-sm">({reviews.length} reviews)</span>
      </div>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-white mb-2">{averageRating}</div>
            <div className="flex items-center gap-1 mb-1">
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
            <p className="text-gray-400 text-sm">{reviews.length} total reviews</p>
          </div>

          {Object.keys(categoryAverages).length > 0 && (
            <div className="flex-1 grid grid-cols-2 gap-3">
              {Object.entries(categoryAverages).map(([category, avg]) => (
                <div key={category} className="text-center p-3 bg-white/5 rounded-lg">
                  <p className="text-white font-semibold">{avg}</p>
                  <p className="text-gray-400 text-xs capitalize">{category.replace('_', ' ')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {reviews.filter(r => r.verified_transaction).length > 0 && (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Award className="w-3 h-3 mr-1" />
            {reviews.filter(r => r.verified_transaction).length} Verified Reviews
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
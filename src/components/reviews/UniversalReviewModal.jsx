import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, X, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const ratingCategories = {
  driver: ['quality', 'communication', 'professionalism'],
  provider: ['quality', 'communication', 'professionalism', 'value'],
  property: ['cleanliness', 'accuracy', 'location', 'value', 'communication'],
  service: ['quality', 'professionalism', 'communication', 'value'],
  rental: ['quality', 'cleanliness', 'value']
};

export default function UniversalReviewModal({ 
  reviewedUserEmail,
  reviewedUserName,
  reviewType,
  bookingId,
  propertyId,
  propertyTitle,
  onClose,
  onSuccess
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [categoryRatings, setCategoryRatings] = useState({});
  const [photos, setPhotos] = useState([]);

  const categories = ratingCategories[reviewType] || ['quality', 'communication', 'professionalism'];

  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData) => {
      const review = await base44.entities.UserReview.create(reviewData);
      
      // Send notification
      await base44.functions.invoke('sendPushNotification', {
        user_email: reviewedUserEmail,
        title: 'New Review Received',
        body: `You received a ${rating}-star review!`,
        notification_type: 'social'
      });

      return review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reviews']);
      queryClient.invalidateQueries(['user-stats']);
      toast.success('Review submitted successfully!');
      if (onSuccess) onSuccess();
      onClose();
    }
  });

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    const user = await base44.auth.me();
    
    submitReviewMutation.mutate({
      reviewed_user_email: reviewedUserEmail,
      reviewer_email: user.email,
      reviewer_name: user.full_name,
      reviewer_photo: user.profile_photo,
      rating,
      review_text: reviewText,
      review_type: reviewType,
      booking_id: bookingId,
      property_id: propertyId,
      property_title: propertyTitle,
      categories: categoryRatings,
      verified_transaction: !!bookingId
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Leave a Review</h2>
                <p className="text-white/80 mt-1">How was your experience with {reviewedUserName}?</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Overall Rating */}
            <div className="text-center">
              <p className="text-gray-400 mb-3">Overall Rating</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-12 h-12 ${
                        star <= (hoveredRating || rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-white font-semibold text-lg mt-2">
                  {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
                </p>
              )}
            </div>

            {/* Category Ratings */}
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">Rate by category</p>
              {categories.map((category) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-white capitalize">{category.replace('_', ' ')}</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setCategoryRatings({ ...categoryRatings, [category]: star })}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= (categoryRatings[category] || 0)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Review Text */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">
                Share your experience (optional)
              </label>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Tell others about your experience..."
                className="bg-white/5 border-white/10 text-white placeholder-gray-500 min-h-[120px]"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 bg-white/5 border-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitReviewMutation.isPending || rating === 0}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
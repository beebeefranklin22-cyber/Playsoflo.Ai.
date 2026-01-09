import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Star, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function PropertyReviewModal({ booking, property, onClose }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");

  const submitReviewMutation = useMutation({
    mutationFn: async (data) => {
      // Create review
      const newReview = await base44.entities.UserReview.create({
        reviewed_user_email: property.created_by,
        rating: data.rating,
        review_text: data.review,
        booking_id: booking.id,
        property_id: property.id,
        property_title: property.title
      });

      // Update property rating
      const reviews = await base44.asServiceRole.entities.UserReview.filter({
        property_id: property.id
      });
      
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = totalRating / reviews.length;

      await base44.asServiceRole.entities.Property.update(property.id, {
        rating: parseFloat(avgRating.toFixed(1)),
        reviews_count: reviews.length
      });

      // Notify host
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: property.created_by,
        type: 'new_review',
        title: '⭐ New Review Received',
        message: `You received a ${data.rating}-star review for ${property.title}`,
        reference_type: 'review',
        reference_id: newReview.id,
        read: false
      });

      return newReview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['properties']);
      queryClient.invalidateQueries(['property-reviews']);
      toast.success('Review submitted! Thank you for your feedback.');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to submit review');
    }
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!review.trim()) {
      toast.error('Please write a review');
      return;
    }

    submitReviewMutation.mutate({ rating, review });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gray-900 rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">Leave a Review</h3>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <h4 className="text-white font-semibold mb-1">{property.title}</h4>
            <p className="text-gray-400 text-sm">{property.location}</p>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Your Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-white text-sm mt-2">
                {rating === 5 && '⭐ Excellent!'}
                {rating === 4 && '👍 Great!'}
                {rating === 3 && '😊 Good'}
                {rating === 2 && '😐 Okay'}
                {rating === 1 && '😞 Needs improvement'}
              </p>
            )}
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Your Review</label>
            <Textarea
              placeholder="Share your experience with future guests..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={5}
              className="bg-white/10 border-white/20 text-white"
            />
            <p className="text-gray-500 text-xs mt-1">{review.length}/500 characters</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitReviewMutation.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {submitReviewMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
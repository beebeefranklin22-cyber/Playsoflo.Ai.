import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, X, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ServiceReviewModal({ isOpen, onClose, booking, currentUser }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [categories, setCategories] = useState({
    quality: 0,
    communication: 0,
    professionalism: 0,
    value: 0
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      // Create the review
      const review = await base44.entities.UserReview.create({
        reviewed_user_email: booking.provider_email,
        reviewer_email: currentUser.email,
        reviewer_name: currentUser.full_name,
        reviewer_photo: currentUser.profile_photo,
        rating,
        review_text: reviewText,
        review_type: 'provider',
        categories,
        verified_transaction: true
      });

      // Update booking with review reference
      await base44.entities.ServiceBooking.update(booking.id, {
        review_submitted: true,
        rating
      });

      // Notify provider
      await base44.entities.Notification.create({
        recipient_email: booking.provider_email,
        type: 'new_comment',
        title: 'New Review Received',
        message: `${currentUser.full_name} left a ${rating}-star review for your service`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        sender_photo: currentUser.profile_photo,
        reference_type: 'booking',
        reference_id: booking.id
      });

      return review;
    },
    onSuccess: () => {
      toast.success('Review submitted successfully!');
      queryClient.invalidateQueries(['my-bookings']);
      queryClient.invalidateQueries(['provider-reviews']);
      onClose();
    },
    onError: () => {
      toast.error('Failed to submit review');
    }
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!reviewText.trim()) {
      toast.error('Please write a review');
      return;
    }
    submitReviewMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-gray-900 rounded-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
            <h3 className="text-xl font-bold text-white">Rate Your Experience</h3>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Service Info */}
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-white font-semibold mb-1">{booking.service_title}</h4>
              <p className="text-gray-400 text-sm">Provider: {booking.provider_email}</p>
              <p className="text-gray-500 text-xs">
                {new Date(booking.booking_date).toLocaleDateString()}
              </p>
            </div>

            {/* Overall Rating */}
            <div>
              <label className="text-white font-medium mb-3 block">Overall Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-12 h-12 ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-gray-400 text-sm mt-2">
                  {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Below Average' : 'Poor'}
                </p>
              )}
            </div>

            {/* Category Ratings */}
            <div className="space-y-4">
              <label className="text-white font-medium block">Rate Specific Aspects</label>
              
              {[
                { key: 'quality', label: 'Service Quality' },
                { key: 'communication', label: 'Communication' },
                { key: 'professionalism', label: 'Professionalism' },
                { key: 'value', label: 'Value for Money' }
              ].map(({ key, label }) => (
                <div key={key} className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 text-sm">{label}</span>
                    <span className="text-yellow-400 text-sm font-bold">
                      {categories[key]}/5
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setCategories({ ...categories, [key]: star })}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= categories[key]
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Review Text */}
            <div>
              <label className="text-white font-medium mb-2 block">Your Review</label>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience... What did you like? What could be improved?"
                className="bg-white/10 border-white/20 text-white min-h-[120px]"
              />
              <p className="text-gray-500 text-xs mt-1">
                {reviewText.length}/500 characters
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={submitReviewMutation.isPending || rating === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {submitReviewMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
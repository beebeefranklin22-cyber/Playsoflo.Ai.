import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function PropertyReviewModal({ booking, onClose, isHost = false }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const reviewMutation = useMutation({
    mutationFn: async (reviewData) => {
      return await base44.entities.UserReview.create(reviewData);
    },
    onSuccess: async () => {
      // Update booking with rating
      await base44.entities.Booking.update(booking.id, {
        rating: rating,
        review_text: comment
      });
      
      qc.invalidateQueries(["property-bookings"]);
      qc.invalidateQueries(["my-bookings"]);
      qc.invalidateQueries(["host-user"]);
      toast.success("Review submitted successfully!");
      onClose();
    }
  });

  const handleSubmit = () => {
    if (!rating) {
      toast.error("Please select a rating");
      return;
    }

    const reviewData = {
      reviewed_email: isHost ? booking.created_by : booking.provider_email,
      rating: rating,
      comment: comment,
      review_type: isHost ? "guest" : "host",
      booking_id: booking.id
    };

    reviewMutation.mutate(reviewData);
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
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden"
      >
        <div className="relative p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">
            {isHost ? "Review Guest" : "Review Your Stay"}
          </h2>
          <p className="text-gray-400 mt-1">{booking.experience_title}</p>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="text-white font-semibold mb-3 block">
              {isHost ? "How was your guest?" : "How was your experience?"}
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoverRating || rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-gray-400 text-sm mt-2">
              {rating > 0 && (
                <>
                  {rating === 5 && "Excellent!"}
                  {rating === 4 && "Very Good"}
                  {rating === 3 && "Good"}
                  {rating === 2 && "Fair"}
                  {rating === 1 && "Needs Improvement"}
                </>
              )}
            </p>
          </div>

          <div>
            <label className="text-white font-semibold mb-2 block">
              Share your experience (optional)
            </label>
            <Textarea
              placeholder={isHost 
                ? "How was communication? Did they follow house rules?"
                : "What did you like? Any suggestions for improvement?"
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-white/10 border-white/20 text-white h-32"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!rating || reviewMutation.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
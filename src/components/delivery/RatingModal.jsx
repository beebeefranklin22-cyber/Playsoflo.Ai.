import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Star, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function RatingModal({ delivery, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.DeliveryOrder.update(delivery.id, {
        rating: rating,
        review: review,
        review_time: new Date().toISOString()
      });

      toast.success("Thank you for your feedback!");
      if (onSubmit) onSubmit();
      onClose();
    } catch (error) {
      toast.error("Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-gray-900 rounded-3xl border border-white/10"
      >
        <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-6 border-b border-white/10 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Rate Your Delivery</h2>
              <p className="text-yellow-100 text-sm">How was your experience?</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Star Rating */}
          <div className="text-center">
            <p className="text-gray-400 mb-4">Tap to rate</p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transform hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-12 h-12 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-white font-semibold mt-3">
                {rating === 5 ? 'Excellent!' : 
                 rating === 4 ? 'Great!' : 
                 rating === 3 ? 'Good' : 
                 rating === 2 ? 'Could be better' : 
                 'Needs improvement'}
              </p>
            )}
          </div>

          {/* Review */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">
              Tell us more (optional)
            </label>
            <Textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your delivery experience..."
              rows={4}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/20"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Rating
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
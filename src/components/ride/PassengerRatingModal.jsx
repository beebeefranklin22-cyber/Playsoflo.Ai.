import React, { useState } from "react";
import { X, Star, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PassengerRatingModal({ ride, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [addToFavorites, setAddToFavorites] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      // Update ride with rating
      await base44.entities.RideRequest.update(ride.id, {
        passenger_rating: rating,
        passenger_review: review
      });

      // Update driver's average rating
      if (ride.driver_email) {
        const drivers = await base44.entities.User.filter({ email: ride.driver_email });
        if (drivers.length > 0) {
          const driver = drivers[0];
          const currentTotal = driver.driver_total_ratings || 0;
          const currentAvg = driver.driver_rating || 0;
          const newTotal = currentTotal + 1;
          const newAvg = ((currentAvg * currentTotal) + rating) / newTotal;

          await base44.asServiceRole.entities.User.update(driver.id, {
            driver_rating: newAvg,
            driver_total_ratings: newTotal
          });
        }

        // Add to favorites if checked
        if (addToFavorites) {
          const currentUser = await base44.auth.me();
          const favorites = currentUser.favorite_drivers || [];
          if (!favorites.includes(ride.driver_email)) {
            await base44.auth.updateMe({
              favorite_drivers: [...favorites, ride.driver_email]
            });
          }
        }

        // Notify driver
        await base44.entities.Notification.create({
          recipient_email: ride.driver_email,
          type: 'ride_update',
          title: `⭐ New Rating: ${rating}/5`,
          message: review || `You received a ${rating}-star rating from a passenger`,
          reference_type: 'ride',
          reference_id: ride.id
        });
      }

      toast.success('✅ Rating submitted!');
      onClose();
    } catch (error) {
      console.error('Rating error:', error);
      toast.error('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-gray-900 rounded-3xl p-6 border border-white/10"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Rate Your Ride</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Star Rating */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-3">How was your experience?</p>
          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transform transition-transform hover:scale-110"
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
            <p className="text-center text-white font-semibold">
              {rating === 5 ? '🌟 Excellent!' :
               rating === 4 ? '👍 Great!' :
               rating === 3 ? '😊 Good' :
               rating === 2 ? '😐 Okay' :
               '😕 Needs Improvement'}
            </p>
          )}
        </div>

        {/* Review Text */}
        <div className="mb-6">
          <label className="text-white text-sm font-semibold mb-2 block">
            Add a comment (optional)
          </label>
          <Textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share details about your experience..."
            className="bg-white/10 border-white/20 text-white min-h-[100px]"
            maxLength={500}
          />
          <p className="text-gray-500 text-xs mt-1">{review.length}/500</p>
        </div>

        {/* Add to Favorites */}
        {rating >= 4 && (
          <div className="mb-6 p-4 bg-pink-500/10 border border-pink-500/30 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addToFavorites}
                onChange={(e) => setAddToFavorites(e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <div className="flex items-center gap-2 text-white">
                <Heart className="w-5 h-5 text-pink-400" />
                <span className="font-semibold">Add driver to favorites</span>
              </div>
            </label>
            <p className="text-gray-400 text-xs mt-1 ml-8">
              Request this driver for future rides
            </p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-6 text-lg font-bold"
        >
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </Button>
      </motion.div>
    </div>
  );
}
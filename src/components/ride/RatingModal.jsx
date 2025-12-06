import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";

export default function RatingModal({ open, onClose, ride, raterType }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [categories, setCategories] = useState({
    driving: 0,
    cleanliness: 0,
    communication: 0,
    professionalism: 0
  });
  const [wouldRideAgain, setWouldRideAgain] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }

    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      const ratedEmail = raterType === "customer" ? ride.driver_email : ride.created_by;

      // Create driver rating if rating a driver
      if (raterType === "customer" && ride.driver_email) {
        await base44.entities.DriverRating.create({
          driver_email: ride.driver_email,
          passenger_email: currentUser.email,
          passenger_name: currentUser.full_name,
          passenger_photo: currentUser.profile_photo,
          ride_id: ride.id,
          rating,
          review_text: review,
          categories,
          would_ride_again: wouldRideAgain
        });

        // Update driver's average rating
        const driverRatings = await base44.entities.DriverRating.filter({ driver_email: ride.driver_email });
        const totalRatings = driverRatings.length;
        const avgRating = driverRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
        
        const drivers = await base44.entities.User.list();
        const driver = drivers.find(u => u.email === ride.driver_email);
        if (driver) {
          await base44.auth.updateMe({
            driver_rating: parseFloat(avgRating.toFixed(2)),
            driver_total_ratings: totalRatings
          });
        }
      } else {
        // Create general rating for passengers rating drivers (fallback)
        await base44.entities.Rating.create({
          ride_id: ride.id,
          rater_email: currentUser.email,
          rated_email: ratedEmail,
          rater_type: raterType,
          rating,
          review,
          categories
        });
      }

      // Notify the rated person
      await base44.entities.Notification.create({
        recipient_email: ratedEmail,
        type: "rating_received",
        title: "New Rating Received",
        message: `You received a ${rating}-star rating from your recent ride.`,
        reference_type: "rating",
        reference_id: ride.id
      });

      alert("Thank you for your feedback!");
      onClose();
    } catch (err) {
      console.error("Rating submission failed:", err);
      alert("Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  const categoryLabels = raterType === "customer" ? {
    driving: "Driving Safety",
    cleanliness: "Vehicle Cleanliness",
    communication: "Communication",
    professionalism: "Professionalism"
  } : {
    communication: "Friendliness",
    cleanliness: "Respectfulness",
    professionalism: "Professionalism",
    punctuality: "Punctuality"
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Rate Your {raterType === "customer" ? "Driver" : "Passenger"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Rating */}
          <div className="text-center">
            <div className="text-gray-400 mb-3">Overall Experience</div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-600"
                    }`}
                  />
                </motion.button>
              ))}
            </div>
            {rating > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-yellow-400 font-bold mt-2"
              >
                {rating === 5 ? "Excellent!" : rating === 4 ? "Great!" : rating === 3 ? "Good" : rating === 2 ? "Okay" : "Poor"}
              </motion.div>
            )}
          </div>

          {/* Category Ratings */}
          <div className="space-y-4">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <div key={key}>
                <div className="text-sm text-gray-400 mb-2">{label}</div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setCategories({ ...categories, [key]: star })}
                      className="p-1"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= categories[key]
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Would Ride Again (for customers rating drivers) */}
          {raterType === "customer" && (
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-white">Would ride with this driver again?</span>
              <button
                onClick={() => setWouldRideAgain(!wouldRideAgain)}
                className={`w-12 h-6 rounded-full transition ${
                  wouldRideAgain ? 'bg-green-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transform transition ${
                  wouldRideAgain ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          )}

          {/* Review Text */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">
              Share Your Experience (Optional)
            </label>
            <Textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Tell us about your ride..."
              rows={4}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || rating === 0}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
          >
            {loading ? "Submitting..." : "Submit Rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
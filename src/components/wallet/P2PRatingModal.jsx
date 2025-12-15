import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Star } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function P2PRatingModal({ order, currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [aspectRatings, setAspectRatings] = useState({
    speed: 0,
    communication: 0,
    trustworthiness: 0
  });

  const traderEmail = order.seller_email === currentUser.email 
    ? order.buyer_email 
    : order.seller_email;

  const tradeType = order.seller_email === currentUser.email ? 'sell' : 'buy';

  const ratingMutation = useMutation({
    mutationFn: async () => {
      // Create rating
      await base44.entities.TraderRating.create({
        trader_email: traderEmail,
        rater_email: currentUser.email,
        order_id: order.id,
        rating,
        review_text: reviewText,
        aspects: aspectRatings,
        trade_type: tradeType
      });

      // Mark order as rated
      await base44.entities.P2POrder.update(order.id, {
        rated: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-p2p-orders']);
      queryClient.invalidateQueries(['trader-stats']);
      toast.success('✅ Rating submitted! Thank you for your feedback.');
      onClose();
    },
    onError: (err) => {
      toast.error('Failed to submit rating: ' + err.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    ratingMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Rate Your Trade</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <p className="text-gray-400 text-sm mb-1">Trading with</p>
            <p className="text-white font-semibold">{traderEmail}</p>
          </div>

          {/* Overall Rating */}
          <div>
            <label className="text-white font-semibold mb-3 block">Overall Rating</label>
            <div className="flex gap-2 justify-center">
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
          </div>

          {/* Aspect Ratings */}
          <div className="space-y-4">
            <label className="text-white font-semibold block">Detailed Ratings</label>
            
            {Object.entries({
              speed: 'Response Speed',
              communication: 'Communication',
              trustworthiness: 'Trustworthiness'
            }).map(([key, label]) => (
              <div key={key}>
                <p className="text-gray-400 text-sm mb-2">{label}</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setAspectRatings({...aspectRatings, [key]: star})}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= aspectRatings[key]
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
            <label className="text-white font-semibold mb-2 block">Your Review (Optional)</label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your trading experience..."
              className="bg-white/10 border-white/20 text-white h-24"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border-white/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={rating === 0 || ratingMutation.isPending}
              className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600"
            >
              {ratingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
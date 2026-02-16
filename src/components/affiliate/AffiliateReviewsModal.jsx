import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ThumbsUp, Upload, X } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function AffiliateReviewsModal({ listing, isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [showAddReview, setShowAddReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ['affiliate-reviews', listing?.id],
    queryFn: () => base44.entities.AffiliateReview.filter({ listing_id: listing.id }),
    enabled: !!listing && isOpen
  });

  const createReviewMutation = useMutation({
    mutationFn: (reviewData) => base44.entities.AffiliateReview.create(reviewData),
    onSuccess: async () => {
      queryClient.invalidateQueries(['affiliate-reviews', listing.id]);
      
      // Update listing rating
      const avgRating = reviews.length > 0 
        ? ((reviews.reduce((sum, r) => sum + r.rating, 0) + rating) / (reviews.length + 1))
        : rating;
      
      await base44.entities.AffiliateListing.update(listing.id, {
        rating: avgRating,
        review_count: (listing.review_count || 0) + 1
      });
      
      queryClient.invalidateQueries(['affiliate-listings']);
      setShowAddReview(false);
      setRating(5);
      setReviewText("");
      setUploadedImages([]);
    }
  });

  const markHelpfulMutation = useMutation({
    mutationFn: ({ reviewId, currentCount }) => 
      base44.entities.AffiliateReview.update(reviewId, { helpful_count: currentCount + 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries(['affiliate-reviews', listing.id]);
    }
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setUploadedImages([...uploadedImages, ...urls]);
    } catch (error) {
      console.error('Image upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitReview = () => {
    if (!reviewText.trim() || !currentUser) return;

    createReviewMutation.mutate({
      listing_id: listing.id,
      reviewer_email: currentUser.email,
      reviewer_name: currentUser.full_name,
      reviewer_photo: currentUser.profile_picture || "",
      rating,
      review_text: reviewText,
      images: uploadedImages
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Reviews for {listing?.title}
          </DialogTitle>
        </DialogHeader>

        {/* Add Review Section */}
        {currentUser && (
          <div className="mb-6">
            {!showAddReview ? (
              <Button
                onClick={() => setShowAddReview(true)}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Write a Review
              </Button>
            ) : (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-lg font-semibold mb-3">Your Review</h3>
                
                {/* Star Rating */}
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <Textarea
                  placeholder="Share your experience with this product/service..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="bg-white/10 border-white/20 text-white mb-3"
                  rows={4}
                />

                {/* Image Upload */}
                <div className="mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="review-images"
                  />
                  <label htmlFor="review-images">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      className="border-white/20 text-white"
                      asChild
                    >
                      <span className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Add Photos'}
                      </span>
                    </Button>
                  </label>

                  {uploadedImages.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg" />
                          <button
                            onClick={() => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
                            className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitReview}
                    disabled={!reviewText.trim() || createReviewMutation.isPending}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    Submit Review
                  </Button>
                  <Button
                    onClick={() => setShowAddReview(false)}
                    variant="outline"
                    className="border-white/20 text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No reviews yet. Be the first to review!
            </div>
          ) : (
            reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={review.reviewer_photo || 'https://via.placeholder.com/40'}
                    alt={review.reviewer_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-white">{review.reviewer_name}</h4>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{review.review_text}</p>
                    
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {review.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt=""
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => markHelpfulMutation.mutate({ 
                        reviewId: review.id, 
                        currentCount: review.helpful_count || 0 
                      })}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Helpful ({review.helpful_count || 0})
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
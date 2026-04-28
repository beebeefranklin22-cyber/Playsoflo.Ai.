import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Star, Upload, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SubmitReviewModal({
  isOpen,
  onClose,
  serviceType,
  serviceId,
  serviceName,
  providerEmail,
  currentUser,
  onSubmitSuccess
}) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryRatings, setCategoryRatings] = useState({
    quality: 0,
    communication: 0,
    timeliness: 0,
    value: 0
  });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotos([...photos, file_url]);
    } catch (error) {
      toast.error("Photo upload failed");
    }
  };

  const handleSubmit = async () => {
    if (!rating || !content.trim()) {
      toast.error("Please provide a rating and review");
      return;
    }

    setLoading(true);
    try {
      await base44.entities.Review.create({
        reviewer_email: currentUser.email,
        reviewer_name: currentUser.full_name,
        reviewer_avatar: currentUser.profile_picture,
        service_type: serviceType,
        service_id: serviceId,
        service_name: serviceName,
        provider_email: providerEmail,
        rating,
        title: title || `${rating} star review`,
        content,
        category_ratings: Object.values(categoryRatings).some(v => v > 0) ? categoryRatings : undefined,
        photos,
        status: "pending",
        verified_purchase: true
      });

      toast.success("Review submitted! Thank you for your feedback.");
      if (onSubmitSuccess) onSubmitSuccess();
      onClose();
    } catch (error) {
      toast.error("Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl border border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl">Share Your Review</h2>
            <p className="text-white/80 text-sm">{serviceName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Overall Rating */}
          <div className="space-y-2">
            <label className="text-white font-semibold">Overall Rating *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-600 hover:text-yellow-400"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-gray-400 text-sm">
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
              </p>
            )}
          </div>

          {/* Category Ratings */}
          <div className="space-y-3">
            <label className="text-white font-semibold">Detailed Feedback (optional)</label>
            {Object.entries(categoryRatings).map(([category, value]) => (
              <div key={category} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm capitalize">{category}</span>
                  <span className="text-gray-400 text-sm">{value > 0 ? value : "-"}</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() =>
                        setCategoryRatings({
                          ...categoryRatings,
                          [category]: star
                        })
                      }
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-white font-semibold">Review Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Summarize your experience in a few words"
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="text-white font-semibold">Your Review *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Share details about your experience, what you liked or didn't like, and recommendations for others..."
              rows={5}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
            <p className="text-gray-400 text-xs">Min 20 characters recommended</p>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <label className="text-white font-semibold">Add Photos (optional)</label>
            <label className="flex items-center justify-center gap-2 p-4 bg-white/5 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/10 transition">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400">Click to upload photos</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
            {photos.length > 0 && (
              <div className="flex gap-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={photo}
                      alt={`Upload ${idx}`}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <button
                      onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="space-y-2 pt-4">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full py-2 text-gray-400 hover:text-white transition font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
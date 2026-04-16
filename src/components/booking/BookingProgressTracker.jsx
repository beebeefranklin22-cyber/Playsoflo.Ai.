import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, Clock, Loader2, Star,
  MessageCircle, X, CalendarCheck, Wrench, PartyPopper
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STEPS = [
  { key: "pending",    label: "Pending",     icon: Clock,         description: "Awaiting provider confirmation" },
  { key: "confirmed",  label: "Confirmed",   icon: CalendarCheck, description: "Provider has confirmed your booking" },
  { key: "in_progress", label: "In Progress", icon: Wrench,       description: "Service is currently underway" },
  { key: "completed",  label: "Completed",   icon: PartyPopper,   description: "Service has been completed" },
];

function ProgressSteps({ status }) {
  const cancelledOrNoShow = status === "cancelled" || status === "no_show";
  const currentIdx = cancelledOrNoShow ? -1 : STEPS.findIndex(s => s.key === status);

  return (
    <div className="relative">
      {/* Connector line */}
      <div className="absolute top-5 left-5 right-5 h-0.5 bg-white/10" />
      <div
        className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-purple-500 to-green-500 transition-all duration-700"
        style={{ width: cancelledOrNoShow ? "0%" : `${(currentIdx / (STEPS.length - 1)) * 100}%` }}
      />
      <div className="relative flex justify-between">
        {STEPS.map((step, idx) => {
          const done = !cancelledOrNoShow && idx < currentIdx;
          const active = !cancelledOrNoShow && idx === currentIdx;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex flex-col items-center gap-2 w-1/4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all z-10 ${
                done   ? "bg-green-500 border-green-500" :
                active ? "bg-purple-600 border-purple-400 shadow-lg shadow-purple-500/40" :
                         "bg-gray-900 border-white/20"
              }`}>
                {done
                  ? <CheckCircle2 className="w-5 h-5 text-white" />
                  : active
                    ? <Icon className="w-5 h-5 text-white animate-pulse" />
                    : <Circle className="w-5 h-5 text-white/30" />
                }
              </div>
              <span className={`text-xs font-semibold text-center leading-tight ${
                done ? "text-green-400" : active ? "text-purple-300" : "text-gray-500"
              }`}>{step.label}</span>
              {active && (
                <span className="text-[10px] text-gray-400 text-center leading-tight hidden sm:block">
                  {step.description}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {cancelledOrNoShow && (
        <div className="mt-4 text-center px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <span className="text-red-400 text-sm font-medium capitalize">{status.replace("_", " ")}</span>
        </div>
      )}
    </div>
  );
}

function RatingModal({ booking, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ServiceBooking.update(booking.id, {
        rating,
        review_submitted: true,
        provider_notes: review
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["customer-bookings"]);
      toast.success("⭐ Rating submitted! Thank you.");
      if (window.NativeAppBridge?.triggerHaptic) window.NativeAppBridge.triggerHaptic("success");
      onSubmitted();
      onClose();
    },
    onError: () => toast.error("Failed to submit rating")
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Rate Your Experience</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center mb-6">
          <p className="text-gray-300 mb-1 font-medium">{booking.service_title}</p>
          <p className="text-gray-500 text-sm">by {booking.provider_name || "Provider"}</p>
        </div>

        {/* Star selector */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-125"
            >
              <Star className={`w-10 h-10 transition-colors ${
                star <= (hover || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-600"
              }`} />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-center text-sm text-purple-300 mb-4 font-semibold">
              {["", "Poor", "Fair", "Good", "Great", "Excellent!"][rating]}
            </p>
            <textarea
              value={review}
              onChange={e => setReview(e.target.value)}
              placeholder="Share your experience (optional)..."
              rows={3}
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none text-sm mb-4"
            />
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 min-h-[44px]"
            >
              {submitMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
              ) : "Submit Rating"}
            </Button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function BookingProgressTracker({ booking, onClose }) {
  const navigate = useNavigate();
  const [showRating, setShowRating] = useState(false);

  const isCompleted = booking.status === "completed";
  const canRate = isCompleted && !booking.review_submitted;
  const isCancelledOrNoShow = booking.status === "cancelled" || booking.status === "no_show";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">{booking.service_title}</h3>
              <p className="text-gray-400 text-sm">by {booking.provider_name || "Provider"}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-5">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-4 font-semibold">Order Progress</p>
            <ProgressSteps status={booking.status} />
          </div>

          {/* Booking Details */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Date</span>
              <span className="text-white">{new Date(booking.booking_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            {booking.booking_time && (
              <div className="flex justify-between">
                <span className="text-gray-400">Time</span>
                <span className="text-white">{booking.booking_time}</span>
              </div>
            )}
            {booking.location && (
              <div className="flex justify-between">
                <span className="text-gray-400">Location</span>
                <span className="text-white text-right max-w-[60%]">{booking.location}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-white/10">
              <span className="text-gray-400 font-medium">Total</span>
              <span className="text-white font-bold text-lg">${booking.total_price}</span>
            </div>
          </div>

          {/* Confirmation Code */}
          {booking.confirmation_code && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 mb-5 text-center">
              <p className="text-purple-300 text-xs uppercase tracking-widest mb-1">Confirmation Code</p>
              <p className="text-white font-mono font-bold text-lg">{booking.confirmation_code}</p>
            </div>
          )}

          {/* Rating section for completed bookings */}
          {isCompleted && (
            <div className={`rounded-xl p-4 mb-5 border ${canRate ? "bg-yellow-500/10 border-yellow-500/30" : "bg-green-500/10 border-green-500/30"}`}>
              {canRate ? (
                <div className="text-center">
                  <p className="text-yellow-300 font-semibold mb-1">How was your experience?</p>
                  <p className="text-gray-400 text-sm mb-3">Help others by rating this service</p>
                  <Button
                    onClick={() => setShowRating(true)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold min-h-[44px]"
                  >
                    <Star className="w-4 h-4 mr-2" /> Leave a Rating
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-green-300 font-semibold text-sm">Rating Submitted</p>
                    {booking.rating && (
                      <div className="flex gap-0.5 mt-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= booking.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                onClose();
                navigate(createPageUrl("Messages") + `?user=${booking.provider_email}`);
              }}
              variant="outline"
              className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4 mr-2" /> Message
            </Button>
            {!isCancelledOrNoShow && !isCompleted && (
              <Button
                onClick={onClose}
                className="flex-1 bg-purple-600 hover:bg-purple-700 min-h-[44px]"
              >
                Done
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showRating && (
          <RatingModal
            booking={booking}
            onClose={() => setShowRating(false)}
            onSubmitted={() => setShowRating(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
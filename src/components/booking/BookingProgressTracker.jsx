import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, Clock, Loader2, Star,
  MessageCircle, X, CalendarCheck, Wrench, PartyPopper,
  CreditCard, UserCheck, MapPin, Bell, RefreshCw,
  Wifi, WifiOff, ChevronRight, Timer, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// ─── Timeline Steps ───────────────────────────────────────────────────────────
const STEPS = [
  {
    key: "payment_confirmed",
    label: "Payment",
    icon: CreditCard,
    description: "Payment received & secured",
    color: "from-blue-500 to-cyan-500",
    matchStatus: ["pending", "confirmed", "in_progress", "completed"]
  },
  {
    key: "vendor_accepted",
    label: "Accepted",
    icon: UserCheck,
    description: "Vendor confirmed booking",
    color: "from-purple-500 to-violet-500",
    matchStatus: ["confirmed", "in_progress", "completed"]
  },
  {
    key: "in_progress",
    label: "In Progress",
    icon: Wrench,
    description: "Service underway",
    color: "from-orange-500 to-amber-500",
    matchStatus: ["in_progress", "completed"]
  },
  {
    key: "completed",
    label: "Complete",
    icon: PartyPopper,
    description: "All done!",
    color: "from-green-500 to-emerald-500",
    matchStatus: ["completed"]
  }
];

// ─── Countdown Hook ───────────────────────────────────────────────────────────
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate);

    const update = () => {
      const now = new Date();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        expired: false
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

// ─── Live Countdown Display ───────────────────────────────────────────────────
function CheckInCountdown({ bookingDate, bookingTime }) {
  const dateStr = bookingTime
    ? `${bookingDate}T${bookingTime}`
    : bookingDate;
  const countdown = useCountdown(dateStr);

  if (!countdown) return null;
  if (countdown.expired) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
        <p className="text-green-400 font-bold text-sm">🎉 It's time! Your appointment is now</p>
      </div>
    );
  }

  const blocks = [
    { label: "Days", value: countdown.days },
    { label: "Hours", value: countdown.hours },
    { label: "Min", value: countdown.minutes },
    { label: "Sec", value: countdown.seconds },
  ];

  return (
    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Timer className="w-4 h-4 text-indigo-400" />
        <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wider">Check-in Countdown</span>
      </div>
      <div className="flex justify-center gap-3">
        {blocks.map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center">
            <motion.div
              key={value}
              initial={{ y: -4, opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-14 h-14 bg-indigo-600/30 border border-indigo-500/40 rounded-xl flex items-center justify-center"
            >
              <span className="text-white font-bold text-xl tabular-nums">
                {String(value).padStart(2, "0")}
              </span>
            </motion.div>
            <span className="text-indigo-400 text-[10px] mt-1 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Progress Timeline ────────────────────────────────────────────────────────
function ProgressTimeline({ status, paymentStatus }) {
  const isCancelledOrNoShow = status === "cancelled" || status === "no_show";

  const getStepState = (step) => {
    if (isCancelledOrNoShow) return "inactive";
    // Payment step: done if payment_status is paid
    if (step.key === "payment_confirmed") {
      if (paymentStatus === "paid") return "done";
      if (status === "pending") return "active";
      return "done";
    }
    if (step.matchStatus.includes(status)) {
      const isCurrentStep = STEPS.findIndex(s => s.key === status) === STEPS.indexOf(step);
      return isCurrentStep ? "active" : "done";
    }
    // Any previous confirmed step should be done
    const stepIdx = STEPS.indexOf(step);
    const statusIdx = STEPS.findIndex(s => s.key === status || s.matchStatus.includes(status));
    if (stepIdx < statusIdx) return "done";
    return "inactive";
  };

  return (
    <div className="relative py-2">
      {/* Connector line */}
      <div className="absolute top-8 left-8 right-8 h-0.5 bg-white/10 z-0" />

      <div className="relative flex justify-between z-10">
        {STEPS.map((step, idx) => {
          const state = getStepState(step);
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex flex-col items-center gap-2 w-1/4">
              <motion.div
                initial={false}
                animate={state === "active" ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: state === "active" ? Infinity : 0, duration: 2 }}
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  state === "done"
                    ? "bg-green-500 border-green-400 shadow-md shadow-green-500/30"
                    : state === "active"
                    ? "bg-purple-600 border-purple-400 shadow-lg shadow-purple-500/40"
                    : "bg-gray-800 border-white/10"
                }`}
              >
                {state === "done" ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : state === "active" ? (
                  <Icon className="w-5 h-5 text-white" />
                ) : (
                  <Icon className="w-5 h-5 text-white/20" />
                )}
              </motion.div>
              <span className={`text-[11px] font-semibold text-center leading-tight ${
                state === "done" ? "text-green-400"
                : state === "active" ? "text-purple-300"
                : "text-gray-600"
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active step description */}
      {!isCancelledOrNoShow && (() => {
        const activeStep = STEPS.find(s => getStepState(s) === "active");
        return activeStep ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center"
          >
            <span className="text-xs text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              {activeStep.description}
            </span>
          </motion.div>
        ) : null;
      })()}

      {isCancelledOrNoShow && (
        <div className="mt-4 text-center px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <span className="text-red-400 text-sm font-medium capitalize">{status.replace("_", " ")}</span>
        </div>
      )}
    </div>
  );
}

// ─── Live Status Badge ────────────────────────────────────────────────────────
function LiveStatusBadge({ isLive }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      isLive ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-400"
    }`}>
      {isLive ? (
        <>
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Live
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          Offline
        </>
      )}
    </div>
  );
}

// ─── Payment Status Panel ─────────────────────────────────────────────────────
function PaymentPanel({ booking }) {
  const isPaid = booking.payment_status === "paid" || booking.total_price > 0;
  return (
    <div className={`rounded-xl p-4 border ${
      isPaid
        ? "bg-blue-500/10 border-blue-500/30"
        : "bg-yellow-500/10 border-yellow-500/30"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          isPaid ? "bg-blue-500/20" : "bg-yellow-500/20"
        }`}>
          {isPaid
            ? <Shield className="w-5 h-5 text-blue-400" />
            : <CreditCard className="w-5 h-5 text-yellow-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${isPaid ? "text-blue-300" : "text-yellow-300"}`}>
            {isPaid ? "Payment Confirmed & Secured" : "Awaiting Payment"}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            {isPaid
              ? `$${booking.total_price} held in escrow until service complete`
              : "Complete payment to confirm your booking"}
          </p>
        </div>
        {isPaid && <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />}
      </div>
    </div>
  );
}

// ─── Vendor Acceptance Panel ──────────────────────────────────────────────────
function VendorPanel({ booking }) {
  const isAccepted = booking.status === "confirmed" || booking.status === "in_progress" || booking.status === "completed";
  const isPending = booking.status === "pending";

  return (
    <div className={`rounded-xl p-4 border ${
      isAccepted
        ? "bg-purple-500/10 border-purple-500/30"
        : isPending
        ? "bg-gray-500/10 border-gray-500/30"
        : "bg-gray-500/10 border-gray-500/30"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAccepted ? "bg-purple-500/20" : "bg-gray-600/20"
        }`}>
          <UserCheck className={`w-5 h-5 ${isAccepted ? "text-purple-400" : "text-gray-500"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${isAccepted ? "text-purple-300" : "text-gray-400"}`}>
            {isAccepted ? "Vendor Accepted" : isPending ? "Waiting for Vendor" : "Pending Acceptance"}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            {isAccepted
              ? `${booking.provider_name || "Provider"} confirmed your booking`
              : "Vendor typically responds within 30 minutes"}
          </p>
        </div>
        {isPending && (
          <div className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
        {isAccepted && <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />}
      </div>
    </div>
  );
}

// ─── Update Feed ──────────────────────────────────────────────────────────────
function UpdateFeed({ bookingId, status }) {
  const updates = [
    ...(status !== "cancelled" ? [{ time: "Just now", text: "Booking request received", icon: "📩", color: "text-blue-400" }] : []),
    ...((status === "confirmed" || status === "in_progress" || status === "completed")
      ? [{ time: "Earlier", text: "Payment confirmed & secured in escrow", icon: "💳", color: "text-cyan-400" }]
      : []
    ),
    ...((status === "confirmed" || status === "in_progress" || status === "completed")
      ? [{ time: "Earlier", text: "Vendor accepted your booking", icon: "✅", color: "text-purple-400" }]
      : []
    ),
    ...(status === "in_progress"
      ? [{ time: "Recently", text: "Service is now underway", icon: "🔧", color: "text-orange-400" }]
      : []
    ),
    ...(status === "completed"
      ? [{ time: "Just now", text: "Service completed — funds released to vendor", icon: "🎉", color: "text-green-400" }]
      : []
    ),
    ...(status === "cancelled"
      ? [{ time: "Recently", text: "Booking was cancelled", icon: "❌", color: "text-red-400" }]
      : []
    ),
  ];

  return (
    <div className="space-y-2">
      {updates.map((update, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5"
        >
          <span className="text-base flex-shrink-0">{update.icon}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${update.color}`}>{update.text}</p>
            <p className="text-gray-500 text-xs mt-0.5">{update.time}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Rating Modal ─────────────────────────────────────────────────────────────
function RatingModal({ booking, onClose }) {
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
                star <= (hover || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-600"
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

// ─── Main Tracker ─────────────────────────────────────────────────────────────
export default function BookingProgressTracker({ booking: initialBooking, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRating, setShowRating] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Live data fetch — polls every 8 seconds
  const { data: liveBooking } = useQuery({
    queryKey: ["live-booking", initialBooking.id],
    queryFn: async () => {
      const bookings = await base44.entities.ServiceBooking.filter({ id: initialBooking.id });
      return bookings[0] || initialBooking;
    },
    initialData: initialBooking,
    refetchInterval: 8000,
    refetchIntervalInBackground: true,
    onSuccess: () => {
      setIsLive(true);
      setLastUpdated(new Date());
    },
    onError: () => setIsLive(false)
  });

  const booking = liveBooking || initialBooking;

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = base44.entities.ServiceBooking.subscribe((event) => {
      if (event.id === initialBooking.id || event.data?.id === initialBooking.id) {
        queryClient.invalidateQueries(["live-booking", initialBooking.id]);
        queryClient.invalidateQueries(["customer-bookings"]);
        setLastUpdated(new Date());
        setIsLive(true);

        const statusMessages = {
          confirmed: "✅ Vendor just accepted your booking!",
          in_progress: "🔧 Service is now underway!",
          completed: "🎉 Service completed successfully!"
        };
        if (event.data?.status && statusMessages[event.data.status]) {
          toast.success(statusMessages[event.data.status]);
          if (window.NativeAppBridge?.triggerHaptic) window.NativeAppBridge.triggerHaptic("medium");
        }
      }
    });
    return unsubscribe;
  }, [initialBooking.id]);

  const isCompleted = booking.status === "completed";
  const canRate = isCompleted && !booking.review_submitted;
  const isCancelledOrNoShow = booking.status === "cancelled" || booking.status === "no_show";
  const isUpcoming = !isCompleted && !isCancelledOrNoShow && booking.status !== "in_progress";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-white/10 px-6 py-4 rounded-t-3xl sm:rounded-t-2xl z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-lg leading-tight truncate">{booking.service_title}</h3>
                <p className="text-gray-400 text-sm mt-0.5">by {booking.provider_name || "Provider"}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <LiveStatusBadge isLive={isLive} />
                <button onClick={onClose} className="text-gray-400 hover:text-white transition p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-gray-600 text-[10px] mt-1.5">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Progress Timeline */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Booking Progress</p>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                  booking.status === "confirmed" ? "bg-green-500/20 text-green-300" :
                  booking.status === "pending" ? "bg-yellow-500/20 text-yellow-300" :
                  booking.status === "in_progress" ? "bg-orange-500/20 text-orange-300" :
                  booking.status === "completed" ? "bg-blue-500/20 text-blue-300" :
                  "bg-red-500/20 text-red-300"
                }`}>
                  {booking.status.replace("_", " ").toUpperCase()}
                </span>
              </div>
              <ProgressTimeline status={booking.status} paymentStatus={booking.payment_status} />
            </div>

            {/* Check-in Countdown */}
            {isUpcoming && booking.booking_date && (
              <CheckInCountdown
                bookingDate={booking.booking_date}
                bookingTime={booking.booking_time}
              />
            )}

            {/* Payment & Vendor Panels */}
            <div className="space-y-3">
              <PaymentPanel booking={booking} />
              <VendorPanel booking={booking} />
            </div>

            {/* Booking Details */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2.5 text-sm">
              <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Booking Details</p>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-2"><CalendarCheck className="w-3.5 h-3.5" /> Date</span>
                <span className="text-white font-medium">
                  {new Date(booking.booking_date).toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric", year: "numeric"
                  })}
                </span>
              </div>
              {booking.booking_time && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Time</span>
                  <span className="text-white font-medium">{booking.booking_time}</span>
                </div>
              )}
              {booking.location && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-400 flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Location</span>
                  <span className="text-white text-right max-w-[60%] font-medium">{booking.location}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2.5 border-t border-white/10">
                <span className="text-gray-400 font-semibold">Total Paid</span>
                <span className="text-white font-bold text-xl">${booking.total_price}</span>
              </div>
            </div>

            {/* Confirmation Code */}
            {booking.confirmation_code && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                <p className="text-purple-300 text-xs uppercase tracking-widest mb-1.5">Confirmation Code</p>
                <p className="text-white font-mono font-bold text-2xl tracking-widest">{booking.confirmation_code}</p>
              </div>
            )}

            {/* Live Activity Feed */}
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5" /> Activity Feed
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              </p>
              <UpdateFeed bookingId={booking.id} status={booking.status} />
            </div>

            {/* Rating Section */}
            {isCompleted && (
              <div className={`rounded-xl p-4 border ${canRate ? "bg-yellow-500/10 border-yellow-500/30" : "bg-green-500/10 border-green-500/30"}`}>
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
            <div className="flex gap-3 pb-1">
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
                <Button onClick={onClose} className="flex-1 bg-purple-600 hover:bg-purple-700 min-h-[44px]">
                  Done
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showRating && (
          <RatingModal booking={booking} onClose={() => setShowRating(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
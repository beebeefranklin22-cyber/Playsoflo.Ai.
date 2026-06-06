import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  X, CheckCircle, ArrowRight, Calendar, Clock, MapPin,
  Phone, MessageSquare, Anchor, Car, Sparkles, Loader2,
  Shield, CreditCard, Star, User, FileText
} from "lucide-react";
import StripePaymentForm from "../payment/StripePaymentForm";
import MessageProviderButton from "../provider/MessageProviderButton";

const LUXURY_ICONS = {
  yacht_charter: Anchor,
  concierge: Sparkles,
  chauffeur: Car,
  car_rental: Car,
  default: Sparkles,
};

function getIcon(category) {
  const Icon = LUXURY_ICONS[category] || LUXURY_ICONS.default;
  return Icon;
}

export default function LuxuryBookingModal({ item, currentUser, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=details, 2=review, 3=payment, 4=confirmed
  const [form, setForm] = useState({
    date: "",
    end_date: "",
    time: "",
    guests: 1,
    pickup_location: "",
    dropoff_location: "",
    special_requests: "",
    phone: currentUser?.provider_phone || currentUser?.phone || "",
    contact_method: "in_app",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  const Icon = getIcon(item.category);
  const isRental = ["yacht_charter", "chauffeur", "car_rental"].includes(item.category);
  const isConcierge = item.category === "concierge";

  const today = new Date().toISOString().split("T")[0];
  const totalDays = form.date && form.end_date
    ? Math.max(1, Math.ceil((new Date(form.end_date) - new Date(form.date)) / 86400000))
    : 1;
  const totalAmount = item.price * (isRental ? totalDays : 1);

  const handleProceedToReview = () => {
    if (!form.date) return toast.error("Please select a start date");
    if (!form.time) return toast.error("Please select a time");
    if (!form.phone) return toast.error("Please enter your phone number");
    if (isRental && !form.end_date) return toast.error("Please select an end date");
    setStep(2);
  };

  const handlePaymentSuccess = async (paymentIntentId) => {
    setIsSubmitting(true);
    try {
      const providerEmail = item.provider_email || item.created_by;

      // Create the service booking record
      const booking = await base44.entities.ServiceBooking.create({
        customer_email: currentUser.email,
        customer_name: currentUser.full_name,
        provider_email: providerEmail,
        provider_name: item.provider_name,
        service_id: item.id,
        service_title: item.title,
        booking_date: form.date,
        booking_time: form.time,
        location: form.pickup_location || item.location || "",
        notes: form.special_requests,
        customer_phone: form.phone,
        total_price: totalAmount,
        status: "confirmed",
        payment_intent_id: paymentIntentId,
        metadata: {
          end_date: form.end_date,
          guests: form.guests,
          dropoff_location: form.dropoff_location,
          contact_method: form.contact_method,
          category: item.category,
          total_days: totalDays,
        },
      });

      setBookingId(booking.id);

      // Notify provider immediately
      try {
        await base44.functions.invoke("sendBookingNotification", {
          recipientEmail: providerEmail,
          type: "new_booking",
          bookingId: booking.id,
          bookingTitle: item.title,
          bookingDate: form.date,
          bookingTime: form.time,
          customerName: currentUser.full_name,
          totalPrice: totalAmount,
        });
        // Notify customer
        await base44.functions.invoke("sendBookingNotification", {
          recipientEmail: currentUser.email,
          type: "booking_confirmed",
          bookingId: booking.id,
          bookingTitle: item.title,
          bookingDate: form.date,
          bookingTime: form.time,
          providerName: item.provider_name,
          totalPrice: totalAmount,
        });
      } catch (e) {
        console.error("Notification error (non-fatal):", e);
      }

      if (window.NativeAppBridge?.triggerHaptic) window.NativeAppBridge.triggerHaptic("success");
      setStep(4);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error("Booking failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        className="w-full sm:max-w-2xl bg-gray-950 rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[95vh] flex flex-col"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 p-6 flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
              <Icon className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{item.title}</h2>
              <p className="text-purple-300 text-sm">by {item.provider_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/80">
            <span className="font-bold text-white text-lg">
              ${item.price?.toFixed(2)}{isRental ? "/day" : `/${item.price_type || "session"}`}
            </span>
            {item.rating && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                {item.rating} ({item.reviews_count || 0})
              </span>
            )}
            {item.verified_provider && (
              <span className="flex items-center gap-1 text-green-300">
                <Shield className="w-3 h-3" /> Verified
              </span>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all ${step >= s ? "bg-purple-400" : "bg-white/20"}`} />
            ))}
          </div>
          <p className="text-purple-300 text-xs mt-1">
            {step === 1 ? "Booking Details" : step === 2 ? "Review & Confirm" : step === 3 ? "Payment" : "Confirmed!"}
          </p>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          <AnimatePresence mode="wait">

            {/* Step 1: Details */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-1 block flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Start Date *
                    </label>
                    <input
                      type="date" min={today}
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                  {isRental ? (
                    <div>
                      <label className="text-gray-300 text-sm mb-1 block flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> End Date *
                      </label>
                      <input
                        type="date" min={form.date || today}
                        value={form.end_date}
                        onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500 text-sm"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-gray-300 text-sm mb-1 block flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Time *
                      </label>
                      <input
                        type="time"
                        value={form.time}
                        onChange={(e) => setForm({ ...form, time: e.target.value })}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500 text-sm"
                      />
                    </div>
                  )}
                </div>

                {isRental && (
                  <div>
                    <label className="text-gray-300 text-sm mb-1 block flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pickup Time *
                    </label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="text-gray-300 text-sm mb-1 block flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {isRental ? "Pickup Location" : "Service Location"}
                  </label>
                  <input
                    type="text"
                    placeholder={isRental ? "Address or marina/port name" : "Your address or preferred location"}
                    value={form.pickup_location}
                    onChange={(e) => setForm({ ...form, pickup_location: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                  />
                </div>

                {isRental && (
                  <div>
                    <label className="text-gray-300 text-sm mb-1 block flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Drop-off Location
                    </label>
                    <input
                      type="text"
                      placeholder="Drop-off address (leave blank if same as pickup)"
                      value={form.dropoff_location}
                      onChange={(e) => setForm({ ...form, dropoff_location: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-1 block flex items-center gap-1">
                      <User className="w-3 h-3" /> Guests / Passengers
                    </label>
                    <input
                      type="number" min={1} max={50}
                      value={form.guests}
                      onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-1 block flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Phone Number *
                    </label>
                    <input
                      type="tel"
                      placeholder="Your phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-300 text-sm mb-1 block flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Special Requests
                  </label>
                  <textarea
                    rows={3}
                    placeholder={isConcierge ? "Describe what you need in detail..." : "Any special requirements, preferences, or requests..."}
                    value={form.special_requests}
                    onChange={(e) => setForm({ ...form, special_requests: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Preferred Contact Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["in_app", "phone", "email"].map((m) => (
                      <button
                        key={m}
                        onClick={() => setForm({ ...form, contact_method: m })}
                        className={`py-2 rounded-xl text-sm font-medium transition ${form.contact_method === m ? "bg-purple-600 text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}
                      >
                        {m === "in_app" ? "In-App Chat" : m === "phone" ? "Phone Call" : "Email"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message provider */}
                {currentUser && (item.created_by || item.provider_email) && currentUser.email !== (item.created_by || item.provider_email) && (
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-gray-400 text-xs mb-2">Have questions first? Message the provider:</p>
                    <MessageProviderButton
                      providerEmail={item.created_by || item.provider_email}
                      providerName={item.provider_name}
                      currentUser={currentUser}
                      className="w-full text-sm"
                    />
                  </div>
                )}

                <button
                  onClick={handleProceedToReview}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-bold hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  Review Booking <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-white font-bold text-lg">Review Your Booking</h3>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 text-sm">
                  <Row label="Service" value={item.title} />
                  <Row label="Provider" value={item.provider_name} />
                  <Row label="Date" value={new Date(form.date + "T12:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} />
                  {isRental && form.end_date && <Row label="End Date" value={new Date(form.end_date + "T12:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />}
                  <Row label="Time" value={form.time} />
                  {form.pickup_location && <Row label={isRental ? "Pickup" : "Location"} value={form.pickup_location} />}
                  {form.dropoff_location && <Row label="Drop-off" value={form.dropoff_location} />}
                  <Row label="Guests" value={form.guests} />
                  <Row label="Contact" value={form.phone} />
                  {isRental && <Row label="Duration" value={`${totalDays} day${totalDays > 1 ? "s" : ""}`} />}
                  {form.special_requests && <Row label="Requests" value={form.special_requests} />}
                  <div className="border-t border-white/10 pt-3 flex justify-between">
                    <span className="text-gray-400 font-bold">Total Amount</span>
                    <span className="text-white font-bold text-xl">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-300 text-sm">
                  ⚠️ By proceeding, you authorize a payment of <strong>${totalAmount.toFixed(2)}</strong>. The provider will be notified immediately.
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition">
                    Edit Details
                  </button>
                  <button onClick={() => setStep(3)} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
                    <CreditCard className="w-4 h-4" /> Pay ${totalAmount.toFixed(2)}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-white font-bold text-lg">Secure Payment</h3>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-sm text-purple-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span>Your payment is encrypted and secured by Stripe. Provider is notified instantly after payment.</span>
                </div>
                <StripePaymentForm
                  amount={totalAmount}
                  description={`${item.title} — ${form.date}${isRental && form.end_date ? ` to ${form.end_date}` : ""}`}
                  recipientEmail={item.provider_email || item.created_by}
                  onSuccess={handlePaymentSuccess}
                  metadata={{
                    type: "luxury_booking",
                    service_id: item.id,
                    category: item.category,
                    booking_date: form.date,
                    end_date: form.end_date,
                    guests: form.guests,
                  }}
                />
                <button onClick={() => setStep(2)} className="w-full py-3 bg-white/10 border border-white/20 rounded-xl text-gray-300 hover:bg-white/20 transition text-sm">
                  ← Back to Review
                </button>
              </motion.div>
            )}

            {/* Step 4: Confirmed */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Booking Confirmed!</h3>
                <p className="text-gray-300">
                  <strong>{item.provider_name}</strong> has been notified and will confirm your request shortly.
                </p>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left text-sm space-y-2">
                  <Row label="Service" value={item.title} />
                  <Row label="Date" value={new Date(form.date + "T12:00").toLocaleDateString()} />
                  <Row label="Total Paid" value={`$${totalAmount.toFixed(2)}`} highlight />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(createPageUrl("CustomerBookings"))}
                    className="flex-1 py-3 bg-purple-600 rounded-xl text-white font-bold hover:bg-purple-700 transition flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> View Bookings
                  </button>
                  <button onClick={onClose} className="flex-1 py-3 bg-white/10 border border-white/20 rounded-xl text-gray-300 hover:bg-white/20 transition">
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className={`text-right ${highlight ? "text-green-400 font-bold text-base" : "text-white"}`}>{value}</span>
    </div>
  );
}
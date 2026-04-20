import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Star, MapPin, Users, Clock, CheckCircle, MessageCircle, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import StripePaymentForm from "@/components/payment/StripePaymentForm";

export default function TravelBookingModal({ listing, onClose }) {
  const [step, setStep] = useState(1); // 1=details, 2=payment, 3=confirmed
  const [booking, setBooking] = useState({
    booking_date: "",
    booking_time: "",
    duration_hours: 1,
    guests: 1,
    special_requests: "",
    selected_add_ons: [],
  });
  const [createdBooking, setCreatedBooking] = useState(null);

  const totalAddOns = booking.selected_add_ons.reduce((sum, a) => sum + a.price, 0);
  const baseTotal = listing.price * (listing.price_type === "per_hour" ? booking.duration_hours : 1);
  const grandTotal = baseTotal + totalAddOns;

  const toggleAddon = (addon) => {
    setBooking(prev => {
      const exists = prev.selected_add_ons.find(a => a.name === addon.name);
      return {
        ...prev,
        selected_add_ons: exists
          ? prev.selected_add_ons.filter(a => a.name !== addon.name)
          : [...prev.selected_add_ons, addon],
      };
    });
  };

  const createBookingRecord = async () => {
    const user = await base44.auth.me();
    return base44.entities.TravelBooking.create({
      listing_id: listing.id,
      listing_title: listing.title,
      category: listing.category,
      customer_email: user.email,
      customer_name: user.full_name,
      provider_email: listing.provider_email,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      duration_hours: Number(booking.duration_hours),
      guests: Number(booking.guests),
      selected_add_ons: booking.selected_add_ons,
      base_price: baseTotal,
      add_ons_total: totalAddOns,
      total_amount: grandTotal,
      special_requests: booking.special_requests,
      status: "pending",
      payment_status: "pending",
    });
  };

  const handlePaymentSuccess = async (paymentIntentId) => {
    try {
      const b = await createBookingRecord();
      await base44.entities.TravelBooking.update(b.id, { payment_status: "paid", status: "confirmed", stripe_session_id: paymentIntentId });
      setCreatedBooking(b);
      setStep(3);
      toast.success("Booking confirmed!");
    } catch (e) {
      toast.error(e.message || "Booking failed");
    }
  };

  const handleMessageProvider = async () => {
    try {
      const user = await base44.auth.me();
      const conv = await base44.entities.ChatConversation.create({
        participants: [user.email, listing.provider_email],
        title: `Booking: ${listing.title}`,
      });
      window.location.href = `/Messages?conversation=${conv.id}`;
    } catch {
      toast.error("Could not open chat");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        className="w-full max-w-xl bg-gray-900 rounded-t-3xl sm:rounded-3xl flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-3 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">
            {step === 3 ? "Booking Confirmed!" : `Book: ${listing.title}`}
          </h2>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-400" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-4">
          {step === 1 && (
            <div className="space-y-4">
              {/* Listing summary */}
              <div className="flex gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                {listing.images?.[0] && (
                  <img src={listing.images[0]} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{listing.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-gray-300 text-sm">{listing.rating || "5.0"}</span>
                  </div>
                  {listing.location && (
                    <span className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />{listing.location}
                    </span>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white font-bold">${listing.price}</p>
                  <p className="text-gray-400 text-xs">/{listing.price_type?.replace("per_", "") || "hr"}</p>
                </div>
              </div>

              {/* Date/time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white text-sm font-medium mb-1 block">Date *</label>
                  <Input type="date" value={booking.booking_date}
                    onChange={e => setBooking(p => ({ ...p, booking_date: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-1 block">Time *</label>
                  <Input type="time" value={booking.booking_time}
                    onChange={e => setBooking(p => ({ ...p, booking_time: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {listing.price_type === "per_hour" && (
                  <div>
                    <label className="text-white text-sm font-medium mb-1 block">Duration (hours)</label>
                    <Input type="number" min="1" value={booking.duration_hours}
                      onChange={e => setBooking(p => ({ ...p, duration_hours: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white" />
                  </div>
                )}
                <div>
                  <label className="text-white text-sm font-medium mb-1 block">Guests</label>
                  <Input type="number" min="1" max={listing.capacity || 100} value={booking.guests}
                    onChange={e => setBooking(p => ({ ...p, guests: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white" />
                </div>
              </div>

              {/* Add-ons */}
              {listing.add_ons?.length > 0 && (
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Optional Add-ons</label>
                  <div className="space-y-2">
                    {listing.add_ons.map((addon, i) => {
                      const selected = booking.selected_add_ons.find(a => a.name === addon.name);
                      return (
                        <button key={i} onClick={() => toggleAddon(addon)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition text-left ${
                            selected ? "bg-white/10 border-white/40" : "bg-white/5 border-white/10 hover:border-white/20"
                          }`}>
                          <div>
                            <p className="text-white text-sm font-medium">{addon.name}</p>
                            {addon.description && <p className="text-gray-400 text-xs">{addon.description}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-400 font-bold text-sm">+${addon.price}</span>
                            {selected && <CheckCircle className="w-4 h-4 text-green-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="text-white text-sm font-medium mb-1 block">Special Requests</label>
                <Textarea value={booking.special_requests}
                  onChange={e => setBooking(p => ({ ...p, special_requests: e.target.value }))}
                  placeholder="Any special requests or notes..."
                  rows={2} className="bg-white/10 border-white/20 text-white" />
              </div>

              {/* Order summary */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
                <div className="flex justify-between text-gray-300 text-sm">
                  <span>${listing.price} × {listing.price_type === "per_hour" ? `${booking.duration_hours}hr` : "1"}</span>
                  <span>${baseTotal.toFixed(2)}</span>
                </div>
                {totalAddOns > 0 && (
                  <div className="flex justify-between text-gray-300 text-sm">
                    <span>Add-ons</span>
                    <span>+${totalAddOns.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-bold border-t border-white/10 pt-2">
                  <span>Total</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between text-white font-bold text-lg py-2 border-b border-white/10">
                <span>Total Due</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
              <StripePaymentForm
                amount={grandTotal}
                referenceType="order"
                referenceId={listing.id}
                description={`Booking: ${listing.title}`}
                onSuccess={handlePaymentSuccess}
                onError={(e) => toast.error(e?.message || "Payment failed")}
              />
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-white text-xl font-bold">You're all set!</h3>
              <p className="text-gray-400">Your booking for <strong className="text-white">{listing.title}</strong> has been confirmed.</p>
              <div className="bg-white/5 rounded-2xl p-4 text-left space-y-2 border border-white/10">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Date</span>
                  <span className="text-white">{booking.booking_date} at {booking.booking_time}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Guests</span>
                  <span className="text-white">{booking.guests}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-2">
                  <span className="text-gray-400">Total Paid</span>
                  <span className="text-green-400">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
              <Button onClick={handleMessageProvider} className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20">
                <MessageCircle className="w-4 h-4 mr-2" />
                Message Provider
              </Button>
              <Button onClick={onClose} className="w-full bg-white text-gray-900 font-bold">Done</Button>
            </div>
          )}
        </div>

        {step === 1 && (
          <div className="p-6 pt-4 border-t border-white/10 flex-shrink-0">
            <Button
              onClick={() => {
                if (!booking.booking_date || !booking.booking_time) {
                  toast.error("Please select a date and time");
                  return;
                }
                setStep(2);
              }}
              className="w-full bg-white text-gray-900 font-bold py-3 text-base"
            >
              Continue to Payment — ${grandTotal.toFixed(2)}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Users, X, Loader2, Wallet, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import StripeCheckoutForm from "@/components/payment/StripeCheckoutForm";
import { propertyBooking } from "@/functions/propertyBooking";

export default function PropertyBookingModal({ property, onClose }) {
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);
  const qc = useQueryClient();
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [guests, setGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");
  const [selectingCheckIn, setSelectingCheckIn] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [processing, setProcessing] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);

  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    const diff = checkOutDate - checkInDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const calculateTotal = () => {
    const nights = calculateNights();
    if (property.listing_type === "short_term" && property.price_per_night) {
      const subtotal = nights * property.price_per_night;
      return property.instant_book ? subtotal * (1 + 0.12) : subtotal;
    }
    return 0;
  };

  const requestBody = (extra) => ({
    action: 'request',
    property_id: property.id,
    check_in_date: checkInDate?.toISOString(),
    check_out_date: checkOutDate?.toISOString(),
    number_of_guests: guests,
    special_requests: specialRequests,
    ...extra,
  });

  const handleRequestBooking = async () => {
    setProcessing(true);
    try {
      const { data } = await propertyBooking(requestBody());
      if (data?.error) throw new Error(data.error);
      qc.invalidateQueries(['properties']);
      qc.invalidateQueries(['my-property-bookings']);
      toast.success('Booking request submitted! Host will review shortly.');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create booking');
    } finally {
      setProcessing(false);
    }
  };

  const handleInstantWalletPay = async () => {
    setProcessing(true);
    try {
      const { data } = await propertyBooking(requestBody({ payment_method: 'wallet' }));
      if (data?.error) throw new Error(data.error);
      qc.invalidateQueries(['properties']);
      qc.invalidateQueries(['my-property-bookings']);
      qc.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Booking confirmed!');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleInstantStripeInitiate = async () => {
    setProcessing(true);
    try {
      const { data } = await propertyBooking(requestBody({ payment_method: 'stripe' }));
      if (data?.error) throw new Error(data.error);
      if (!data?.client_secret || !data?.publishable_key) throw new Error('Payment setup failed — missing credentials');
      const stripe = await loadStripe(data.publishable_key);
      setStripePromise(stripe);
      setClientSecret(data.client_secret);
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleInstantStripeSuccess = async (intentId) => {
    setProcessing(true);
    try {
      const { data } = await propertyBooking(requestBody({ payment_method: 'stripe', confirm_payment_intent_id: intentId }));
      if (data?.error) throw new Error(data.error);
      qc.invalidateQueries(['properties']);
      qc.invalidateQueries(['my-property-bookings']);
      qc.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Booking confirmed!');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to finalize booking');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = () => {
    if (!currentUser) {
      toast.error('Please log in to make a booking');
      return;
    }

    if (!checkInDate || !checkOutDate) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    if (checkOutDate <= checkInDate) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    const nights = calculateNights();
    if (property.minimum_stay && nights < property.minimum_stay) {
      toast.error(`Minimum stay is ${property.minimum_stay} night${property.minimum_stay > 1 ? 's' : ''}`);
      return;
    }

    if (!property.instant_book) {
      handleRequestBooking();
    } else if (paymentMethod === 'wallet') {
      if (parseFloat(currentUser?.usd_balance || 0) < calculateTotal()) {
        toast.error('Insufficient wallet balance. Add funds or pay by card instead.');
        return;
      }
      handleInstantWalletPay();
    } else {
      handleInstantStripeInitiate();
    }
  };

  const nights = calculateNights();
  const total = calculateTotal();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="relative h-48">
          <img
            src={property.main_image}
            alt={property.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center hover:bg-white/30"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-8">
          <h2 className="text-3xl font-bold text-white mb-2">{property.title}</h2>
          <p className="text-gray-400 mb-6">{property.location}</p>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-400" />
                {selectingCheckIn ? "Select Check-In Date" : "Select Check-Out Date"}
              </h3>
              <Calendar
                mode="single"
                selected={selectingCheckIn ? checkInDate : checkOutDate}
                onSelect={(date) => {
                  if (selectingCheckIn) {
                    setCheckInDate(date);
                    setCheckOutDate(null);
                    setSelectingCheckIn(false);
                  } else {
                    setCheckOutDate(date);
                  }
                }}
                disabled={(date) => date < new Date()}
                className="bg-white/5 rounded-xl border border-white/10 p-3"
              />
              {checkInDate && checkOutDate && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCheckInDate(null);
                    setCheckOutDate(null);
                    setSelectingCheckIn(true);
                  }}
                  className="w-full mt-3"
                >
                  Reset Dates
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Check-In</span>
                  <span className="text-white font-semibold">
                    {checkInDate ? checkInDate.toLocaleDateString() : "Select date"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Check-Out</span>
                  <span className="text-white font-semibold">
                    {checkOutDate ? checkOutDate.toLocaleDateString() : "Select date"}
                  </span>
                </div>
                {nights > 0 && (
                  <div className="flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="text-gray-400">Total Nights</span>
                    <span className="text-white font-bold">{nights}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Number of Guests
                </label>
                <Input
                  type="number"
                  min="1"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Special Requests (Optional)</label>
                <Textarea
                  placeholder="Early check-in, late check-out, etc."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="bg-white/10 border-white/20 text-white h-24"
                />
              </div>

              {property.minimum_stay && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-300 text-sm">
                    Minimum stay: {property.minimum_stay} night{property.minimum_stay > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">
                    ${property.price_per_night} × {nights || 0} night{nights !== 1 ? 's' : ''}
                  </span>
                  <span className="text-white font-semibold">${(property.price_per_night * nights || 0).toFixed(2)}</span>
                </div>
                {property.instant_book && nights > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Service Fee (12%)</span>
                    <span className="text-gray-300">${(property.price_per_night * nights * 0.12).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-emerald-500/30 pt-2 flex items-center justify-between">
                  <span className="text-white font-bold text-lg">Total</span>
                  <span className="text-emerald-400 font-bold text-2xl">${total.toFixed(2)}</span>
                </div>
                {!property.instant_book && nights > 0 && (
                  <p className="text-gray-400 text-xs">You won't be charged until the host approves your request.</p>
                )}
              </div>

              {property.instant_book && !clientSecret && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('wallet')}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                      paymentMethod === 'wallet' ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    <span className="text-white text-sm font-medium">Wallet</span>
                    <span className="text-gray-400 text-xs">${(currentUser?.usd_balance || 0).toFixed(2)} available</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('stripe')}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                      paymentMethod === 'stripe' ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    <span className="text-white text-sm font-medium">Card</span>
                  </button>
                </div>
              )}

              {property.instant_book && clientSecret && stripePromise ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#10b981' } } }}>
                  <StripeCheckoutForm
                    amount={total}
                    onSuccess={handleInstantStripeSuccess}
                    onCancel={() => { setClientSecret(null); setStripePromise(null); }}
                    isProcessing={processing}
                    setIsProcessing={setProcessing}
                  />
                </Elements>
              ) : (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!checkInDate || !checkOutDate || processing}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {property.instant_book ? 'Processing...' : 'Submitting...'}
                      </>
                    ) : property.instant_book ? (
                      `Pay $${total.toFixed(2)} & Book`
                    ) : (
                      "Request Booking"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

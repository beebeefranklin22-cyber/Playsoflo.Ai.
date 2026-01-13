import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StripePaymentForm from "../payment/StripePaymentForm";

export default function QuickBookingFlow({ service, provider, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    notes: '',
    location: service.location || '',
    phone: ''
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setBookingData(prev => ({ ...prev, phone: user.provider_phone || '' }));
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    loadUser();
  }, []);

  // Fetch available slots when date changes
  useEffect(() => {
    if (bookingData.date && provider) {
      loadAvailableSlots();
    }
  }, [bookingData.date]);

  const loadAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      const dayOfWeek = new Date(bookingData.date).toLocaleDateString('en-US', { weekday: 'lowercase' });
      
      // Get provider availability
      const availability = await base44.entities.ProviderAvailability.filter({
        provider_email: provider.email || provider.created_by,
        day_of_week: dayOfWeek
      });

      if (availability.length === 0 || !availability[0].is_available) {
        setAvailableSlots([]);
        toast.error('Provider is not available on this day');
        return;
      }

      const avail = availability[0];
      const startTime = avail.start_time;
      const endTime = avail.end_time;
      const duration = avail.slot_duration_minutes || 60;

      // Get existing bookings for this date
      const existingBookings = await base44.entities.ServiceBooking.filter({
        provider_email: provider.email || provider.created_by,
        booking_date: bookingData.date
      });

      // Generate time slots
      const slots = [];
      let current = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);

      while (current < end) {
        const timeString = current.toTimeString().substring(0, 5);
        const isBooked = existingBookings.some(b => b.booking_time === timeString);
        
        if (!isBooked) {
          slots.push(timeString);
        }
        
        current = new Date(current.getTime() + duration * 60000);
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to load slots:', error);
      toast.error('Failed to load available time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const createBookingMutation = useMutation({
    mutationFn: async (paymentIntentId) => {
      // Validate payment intent exists
      if (!paymentIntentId) {
        throw new Error('Payment verification failed');
      }
      
      // Validate all required data
      if (!currentUser?.email || !bookingData.date || !bookingData.time) {
        throw new Error('Missing required booking information');
      }
      
      return await base44.entities.ServiceBooking.create({
        customer_email: currentUser.email,
        customer_name: currentUser.full_name,
        provider_email: provider.email || provider.created_by,
        provider_name: provider.provider_business_name || provider.full_name,
        service_id: service.id,
        service_title: service.title,
        booking_date: bookingData.date,
        booking_time: bookingData.time,
        location: bookingData.location,
        notes: bookingData.notes,
        customer_phone: bookingData.phone,
        total_price: service.price,
        status: 'confirmed',
        payment_intent_id: paymentIntentId
      });
    },
    onSuccess: () => {
      setCurrentStep(4);
      toast.success('Booking confirmed!');
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error('Booking failed: ' + error.message);
      setCurrentStep(3);
    }
  });

  const handlePaymentSuccess = (paymentIntentId) => {
    createBookingMutation.mutate(paymentIntentId);
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                currentStep >= step
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-500'
              }`}
            >
              {currentStep > step ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                step
              )}
            </div>
            {step < 4 && (
              <div
                className={`flex-1 h-1 mx-2 transition-all ${
                  currentStep > step ? 'bg-purple-600' : 'bg-white/10'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Select Date */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-white font-bold text-xl mb-4">Select a Date</h3>
                <Input
                  type="date"
                  min={getTomorrowDate()}
                  value={bookingData.date}
                  onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!bookingData.date}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Select Time */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-white font-bold text-xl mb-4">Select a Time</h3>
                
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No available slots for this date</p>
                    <Button
                      onClick={() => setCurrentStep(1)}
                      variant="outline"
                      className="mt-4"
                    >
                      Choose Another Date
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setBookingData({ ...bookingData, time: slot })}
                          className={`p-3 rounded-lg border transition-all ${
                            bookingData.time === slot
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setCurrentStep(1)}
                        variant="outline"
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => setCurrentStep(3)}
                        disabled={!bookingData.time}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Details & Payment */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-white font-bold text-xl mb-4">Booking Details</h3>
                
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-purple-300">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(bookingData.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-300">
                    <Clock className="w-4 h-4" />
                    <span>{bookingData.time}</span>
                  </div>
                </div>

                <Input
                  placeholder="Your Phone Number"
                  value={bookingData.phone}
                  onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Textarea
                  placeholder="Any special requests or notes?"
                  value={bookingData.notes}
                  onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                  rows={3}
                  className="bg-white/10 border-white/20 text-white"
                />

                <div className="border-t border-white/10 pt-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                    <p className="text-yellow-300 text-sm font-medium">
                      ⚠️ You are about to make a payment. Please review your booking details carefully before proceeding.
                    </p>
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Service</span>
                      <span className="text-white font-medium">{service.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Provider</span>
                      <span className="text-white font-medium">{provider.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date</span>
                      <span className="text-white font-medium">{new Date(bookingData.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time</span>
                      <span className="text-white font-medium">{bookingData.time}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/10">
                      <span className="text-gray-400 font-bold">Total</span>
                      <span className="text-white font-bold text-xl">${service.price}</span>
                    </div>
                  </div>
                  
                  <StripePaymentForm
                    amount={service.price}
                    description={`Booking: ${service.title}`}
                    recipientEmail={provider.email || provider.created_by}
                    onSuccess={handlePaymentSuccess}
                    metadata={{
                      type: 'service_booking',
                      service_id: service.id,
                      booking_date: bookingData.date,
                      booking_time: bookingData.time
                    }}
                  />
                </div>

                <Button
                  onClick={() => setCurrentStep(2)}
                  variant="outline"
                  className="w-full"
                >
                  Back
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/30">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h3>
                <p className="text-gray-300 mb-6">
                  You'll receive a confirmation email shortly
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate(createPageUrl("CustomerBookings"))}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    View My Bookings
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
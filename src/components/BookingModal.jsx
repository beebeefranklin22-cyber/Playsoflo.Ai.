import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  X, Calendar, Clock, MapPin, DollarSign, Check,
  AlertCircle, Loader2, User, Phone, Mail, Users, Bell, Sparkles, Send
} from "lucide-react";
import StripePaymentForm from "@/components/payment/StripePaymentForm";
import PaymentConfirmation from "./payment/PaymentConfirmation";

export default function BookingModal({ service, onClose }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [step, setStep] = useState(1); // 1: Date/Time, 2: Details, 3: Confirmation
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [showNearbySlots, setShowNearbySlots] = useState(false);
  const [duration, setDuration] = useState(1);
  const [locationType, setLocationType] = useState("provider_location");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [joinWaitingList, setJoinWaitingList] = useState(false);
  const [paymentOption, setPaymentOption] = useState("full");
  const [groupSize, setGroupSize] = useState(2);
  const [contactInfo, setContactInfo] = useState({
    name: "",
    phone: "",
    email: ""
  });
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [paymentType, setPaymentType] = useState("wallet");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setContactInfo({
          name: user.full_name || "",
          phone: user.phone || "",
          email: user.email
        });
      } catch (err) {
        console.error('Failed to load user:', err);
      }
    };
    loadUser();
  }, []);

  // Fetch provider availability
  const { data: availability = [], isLoading: loadingAvailability } = useQuery({
    queryKey: ['provider-availability', service?.created_by],
    queryFn: async () => {
      if (!service?.created_by) return [];
      try {
        return await base44.entities.ProviderAvailability.filter({
          provider_email: service.created_by
        });
      } catch (err) {
        console.error('Failed to fetch availability:', err);
        return [];
      }
    },
    enabled: !!service?.created_by,
    staleTime: 5 * 60 * 1000
  });

  // Fetch existing bookings for selected date
  const { data: existingBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings-for-date', service?.created_by, selectedDate],
    queryFn: async () => {
      if (!service?.created_by || !selectedDate) return [];
      try {
        return await base44.entities.ServiceBooking.filter({
          provider_email: service.created_by,
          booking_date: selectedDate,
          status: { $ne: "cancelled" }
        });
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
        return [];
      }
    },
    enabled: !!service?.created_by && !!selectedDate && selectedDate.length > 0,
    staleTime: 60 * 1000
  });

  // Generate available time slots - memoized to prevent recalculation
  const availableSlots = useMemo(() => {
    if (!selectedDate || availability.length === 0) {
      return [];
    }

    try {
      const date = new Date(selectedDate);
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
      
      const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek && a.is_available);
      
      if (!dayAvailability || !dayAvailability.start_time || !dayAvailability.end_time) {
        return [];
      }

      const slots = [];
      const startHour = parseInt(dayAvailability.start_time.split(':')[0]);
      const endHour = parseInt(dayAvailability.end_time.split(':')[0]);

      if (isNaN(startHour) || isNaN(endHour) || startHour >= endHour) {
        return [];
      }

      for (let hour = startHour; hour < endHour; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        
        const isBooked = existingBookings.some(booking => {
          if (!booking.booking_time) return false;
          const bookingHour = parseInt(booking.booking_time.split(':')[0]);
          const bookingEndHour = bookingHour + (booking.duration_hours || 1);
          return hour >= bookingHour && hour < bookingEndHour;
        });

        if (!isBooked) {
          slots.push(timeStr);
        }
      }

      return slots;
    } catch (err) {
      console.error('Error generating slots:', err);
      return [];
    }
  }, [selectedDate, availability, existingBookings]);

  // Find nearby available slots based on preferred time
  const getNearbySlots = (preferredTimeStr) => {
    if (!preferredTimeStr || availableSlots.length === 0) return [];
    
    const preferredHour = parseInt(preferredTimeStr.split(':')[0]);
    const nearby = availableSlots.map(slot => {
      const slotHour = parseInt(slot.split(':')[0]);
      return {
        time: slot,
        difference: Math.abs(slotHour - preferredHour)
      };
    }).sort((a, b) => a.difference - b.difference).slice(0, 4);
    
    return nearby.map(n => n.time);
  };

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData) => {
      const confirmationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const booking = await base44.entities.ServiceBooking.create({
        ...bookingData,
        confirmation_code: confirmationCode,
        customer_email: currentUser.email,
        status: 'pending'
      });

      // Send notifications to both provider and customer
      await base44.functions.invoke('sendBookingNotifications', {
        booking_id: booking.id,
        notification_type: 'new_booking',
        provider_email: service.created_by,
        customer_email: currentUser.email,
        service_title: service.title,
        booking_date: bookingData.booking_date,
        booking_time: bookingData.booking_time,
        total_price: bookingData.total_price,
        confirmation_code: confirmationCode
      });

      return booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings-for-date']);
      queryClient.invalidateQueries(['my-bookings']);
      queryClient.invalidateQueries(['provider-bookings']);
      setStep(3);
    },
    onError: (error) => {
      console.error('Booking error:', error);
      alert('Booking failed: ' + error.message);
    }
  });

  const handleSubmit = async () => {
    if (joinWaitingList) {
      // Handle waiting list
      try {
        await base44.entities.ServiceBooking.create({
          service_id: service.id,
          service_title: service.title,
          provider_email: service.created_by,
          customer_email: currentUser.email,
          booking_date: selectedDate,
          booking_time: preferredTime,
          duration_hours: duration,
          total_price: service.price * duration,
          status: 'waitlisted',
          customer_notes: customerNotes,
          payment_option: paymentOption,
          group_size: paymentOption === 'group' ? groupSize : 1
        });
        
        await base44.entities.Notification.create({
          recipient_email: currentUser.email,
          type: 'booking_update',
          title: 'Added to Waiting List',
          message: `You've been added to the waiting list for ${service.title} on ${selectedDate}. We'll notify you if a slot opens up!`,
          reference_type: 'booking',
          reference_id: service.id
        });
        
        setStep(3);
        return;
      } catch (err) {
        console.error('Waitlist error:', err);
        alert('Failed to join waiting list');
        return;
      }
    }

    if (!selectedDate || !selectedTime) {
      alert('Please select date and time');
      return;
    }

    if (!contactInfo.name || !contactInfo.phone) {
      alert('Please enter your contact information');
      return;
    }

    const totalPrice = service.price * duration;
    const location = locationType === 'customer_location' ? customerAddress : service.location || "Provider's location";
    const amountToPay = paymentOption === 'layaway' ? totalPrice * 0.25 : totalPrice;

    // Store booking data and show payment
    setPendingBooking({
      service_id: service.id,
      service_title: service.title,
      provider_email: service.created_by,
      booking_date: selectedDate,
      booking_time: selectedTime,
      duration_hours: duration,
      total_price: totalPrice,
      location_type: locationType,
      customer_address: locationType === 'customer_location' ? customerAddress : null,
      location: location,
      customer_notes: customerNotes,
      payment_option: paymentOption,
      group_size: paymentOption === 'group' ? groupSize : 1,
      amount_paid: amountToPay
    });
    
    setShowPayment(true);
  };

  const handlePaymentSuccess = async () => {
    try {
      const confirmationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Deduct from customer wallet if using wallet
      if (paymentType === "wallet") {
        if (currentUser.balance_usd < pendingBooking.amount_paid) {
          toast.error("Insufficient wallet balance");
          return;
        }
        
        await base44.auth.updateMe({
          balance_usd: currentUser.balance_usd - pendingBooking.amount_paid
        });
      }
      
      // Create booking
      const booking = await base44.entities.Booking.create({
        experience_id: service.id,
        experience_title: service.title,
        provider_email: service.created_by || service.provider_email,
        booking_date: pendingBooking.booking_date,
        number_of_guests: pendingBooking.group_size || 1,
        total_price_usd: pendingBooking.total_price,
        payment_method: paymentType,
        payment_status: "pending",
        booking_status: "pending",
        booking_type: "service",
        special_requests: customerNotes,
        confirmation_code: confirmationCode
      });

      // Create payment record
      await base44.entities.Payment.create({
        amount_usd: pendingBooking.amount_paid,
        amount_rri: 0,
        method: paymentType,
        status: "completed",
        reference_type: "order",
        reference_id: booking.id,
        sender_email: currentUser.email,
        recipient_email: service.created_by || service.provider_email,
        memo: `Booking: ${service.title}`
      });

      // Notify provider
      await base44.entities.Notification.create({
        recipient_email: service.created_by || service.provider_email,
        type: "booking_requests",
        title: "New Booking Request",
        message: `${currentUser.full_name || currentUser.email} booked ${service.title} on ${new Date(pendingBooking.booking_date).toLocaleDateString()}`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        reference_type: "order",
        reference_id: booking.id,
        read: false
      });

      setShowPaymentConfirmation(true);
      queryClient.invalidateQueries(['my-bookings']);
      queryClient.invalidateQueries(['provider-bookings']);
    } catch (error) {
      console.error('Booking creation error:', error);
      toast.error('Booking failed: ' + error.message);
    }
  };

  // Get next 30 days for date selection
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // AI Assistant - Answer questions and suggest bookings
  const handleAIQuery = async () => {
    if (!aiInput.trim()) return;
    
    const userMessage = { role: 'user', content: aiInput };
    setAiMessages(prev => [...prev, userMessage]);
    setAiInput("");
    setAiLoading(true);

    try {
      // Prepare context for AI
      const availabilityContext = availability.length > 0 
        ? availability.map(a => `${a.day_of_week}: ${a.is_available ? `${a.start_time}-${a.end_time}` : 'unavailable'}`).join(', ')
        : 'No availability data';

      const upcomingSlotsContext = selectedDate && availableSlots.length > 0
        ? `Available slots on ${selectedDate}: ${availableSlots.join(', ')}`
        : selectedDate ? `No slots available on ${selectedDate}` : '';

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Ronron AI, a friendly booking assistant. Help the customer with their inquiry about this service.

Service Details:
- Name: ${service.title}
- Price: $${service.price} per ${service.price_type}
- Description: ${service.description || 'Professional service'}
- Provider: ${service.provider_name || 'Professional'}

Provider Availability:
${availabilityContext}

${upcomingSlotsContext}

Customer Selected: ${selectedDate ? `Date: ${selectedDate}${selectedTime ? `, Time: ${selectedTime}` : ''}` : 'Nothing yet'}

Customer Question: ${userMessage.content}

Provide a helpful, friendly response. If they're asking about:
1. Availability - Suggest the best available times based on their preferences
2. Service details - Answer based on the service information
3. Booking help - Guide them through the process
4. Alternative times - Recommend nearby slots if their preferred time is unavailable

Be conversational, concise (2-3 sentences), and helpful. If suggesting times, format them clearly.`,
        add_context_from_internet: false
      });

      const aiMessage = { role: 'assistant', content: response };
      setAiMessages(prev => [...prev, aiMessage]);

      // Check if AI suggested a time and auto-fill if possible
      const timeMatch = response.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch && !selectedTime) {
        const suggestedTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
        if (availableSlots.includes(suggestedTime)) {
          setSelectedTime(suggestedTime);
        }
      }
    } catch (error) {
      const errorMessage = { role: 'assistant', content: "I'm having trouble right now. Please try again or proceed with your booking manually." };
      setAiMessages(prev => [...prev, errorMessage]);
    } finally {
      setAiLoading(false);
    }
  };

  // Initialize AI with welcome message
  React.useEffect(() => {
    if (showAIAssistant && aiMessages.length === 0) {
      setAiMessages([{
        role: 'assistant',
        content: `Hi! I'm Ronron, your booking assistant. I can help you find the perfect time for ${service.title}, answer questions about the service, or suggest alternatives if your preferred slot isn't available. How can I help you today?`
      }]);
    }
  }, [showAIAssistant]);

  if (!service) return null;

  return (
    <>
      {showPaymentConfirmation && (
        <PaymentConfirmation
          amount={pendingBooking?.amount_paid}
          currency="USD"
          recipient={service.provider_name || "Provider"}
          type="booking"
          onClose={() => {
            setShowPaymentConfirmation(false);
            setStep(3);
          }}
        />
      )}
      
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Book Service</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <img
                src={service?.image_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200"}
                alt={service?.title}
                className="w-20 h-20 object-cover rounded-xl"
              />
              <div>
                <h3 className="text-white font-bold text-lg">{service?.title}</h3>
                <p className="text-white/80 text-sm">{service?.provider_name || 'Professional Service'}</p>
                <p className="text-white font-bold mt-1">${service?.price}/{service?.price_type}</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    step >= s ? 'bg-white text-purple-600' : 'bg-white/20 text-white'
                  }`}>
                    {step > s ? <Check className="w-5 h-5" /> : s}
                  </div>
                  {s < 3 && <div className={`w-12 h-1 ${step > s ? 'bg-white' : 'bg-white/20'}`} />}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* AI Assistant Toggle Button */}
            <div className="mb-4">
              <Button
                onClick={() => setShowAIAssistant(!showAIAssistant)}
                variant="outline"
                className="w-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 hover:from-purple-600/30 hover:to-pink-600/30"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {showAIAssistant ? 'Hide' : 'Ask'} Ronron AI Assistant
              </Button>
            </div>

            {/* AI Assistant Chat */}
            {showAIAssistant && (
              <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30 mb-6">
                <CardContent className="p-4">
                  <div className="space-y-3 max-h-60 overflow-y-auto mb-3">
                    {aiMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            msg.role === 'user'
                              ? 'bg-purple-600 text-white'
                              : 'bg-white/10 text-gray-200'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white/10 rounded-2xl px-4 py-2">
                          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAIQuery()}
                      placeholder="Ask about availability, service details, or get suggestions..."
                      className="bg-white/10 border-white/20 text-white"
                      disabled={aiLoading}
                    />
                    <Button
                      onClick={handleAIQuery}
                      disabled={aiLoading || !aiInput.trim()}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Date & Time Selection */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div>
                  <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    Select Date
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {getAvailableDates().map((date) => (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`p-3 rounded-xl text-center transition ${
                          selectedDate === date
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-xs">{formatDate(date)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedDate && (
                  <div>
                    <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                      <Clock className="w-5 h-5 text-purple-400" />
                      {availableSlots.length === 0 ? 'Preferred Time' : 'Select Time'}
                    </label>
                    {loadingBookings || loadingAvailability ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="space-y-3">
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                          <AlertCircle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                          <p className="text-yellow-400 text-sm text-center mb-3">
                            All slots are fully booked for this date
                          </p>
                          <Input
                            type="time"
                            value={preferredTime}
                            onChange={(e) => setPreferredTime(e.target.value)}
                            className="bg-white/10 border-white/20 text-white mb-2"
                            placeholder="Enter preferred time"
                          />
                          <Button
                            onClick={() => setJoinWaitingList(true)}
                            className="w-full bg-yellow-600 hover:bg-yellow-700"
                          >
                            <Bell className="w-4 h-4 mr-2" />
                            Join Waiting List
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-2">
                          {availableSlots.map((time) => (
                            <button
                              key={time}
                              onClick={() => {
                                setSelectedTime(time);
                                setPreferredTime(time);
                                setShowNearbySlots(false);
                              }}
                              className={`p-3 rounded-xl text-center transition ${
                                selectedTime === time
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                        
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                          <p className="text-blue-300 text-xs mb-2">Can't find your preferred time?</p>
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              value={preferredTime}
                              onChange={(e) => {
                                setPreferredTime(e.target.value);
                                setShowNearbySlots(true);
                              }}
                              className="bg-white/10 border-white/20 text-white flex-1"
                            />
                          </div>
                          {showNearbySlots && preferredTime && (
                            <div className="mt-2">
                              <p className="text-blue-300 text-xs mb-2">Nearby available slots:</p>
                              <div className="grid grid-cols-4 gap-2">
                                {getNearbySlots(preferredTime).map((time) => (
                                  <button
                                    key={time}
                                    onClick={() => setSelectedTime(time)}
                                    className={`p-2 rounded-lg text-center transition text-xs ${
                                      selectedTime === time
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                    }`}
                                  >
                                    {time}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedDate && selectedTime && (
                  <div>
                    <label className="text-white font-semibold mb-3 block">Duration (hours)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((hrs) => (
                        <button
                          key={hrs}
                          onClick={() => setDuration(hrs)}
                          className={`flex-1 p-3 rounded-xl transition ${
                            duration === hrs
                              ? 'bg-purple-600 text-white'
                              : 'bg-white/5 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          {hrs}h
                        </button>
                      ))}
                    </div>
                    <p className="text-gray-400 text-sm mt-2">
                      Total: ${(service.price * duration).toFixed(2)}
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedDate || (!selectedTime && !joinWaitingList)}
                  className="w-full bg-purple-600 hover:bg-purple-700 py-6 text-lg"
                >
                  Continue
                </Button>
              </motion.div>
            )}

            {/* Payment Step */}
            {showPayment && pendingBooking && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                  <h4 className="text-white font-semibold mb-2">Payment Required</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Amount to pay now:</span>
                    <span className="text-white font-bold text-lg">
                      ${pendingBooking.amount_paid.toFixed(2)}
                    </span>
                  </div>
                  {paymentOption === 'layaway' && (
                    <p className="text-gray-400 text-xs mt-2">
                      Remaining balance: ${(pendingBooking.total_price - pendingBooking.amount_paid).toFixed(2)} due before appointment
                    </p>
                  )}
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-3">
                  <button
                    onClick={() => setPaymentType("wallet")}
                    className={`w-full p-4 rounded-xl border-2 transition ${
                      paymentType === "wallet"
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-white/20 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-purple-400" />
                        <span className="text-white">Wallet Balance</span>
                      </div>
                      <span className="text-gray-400">${currentUser?.balance_usd?.toFixed(2) || "0.00"}</span>
                    </div>
                  </button>

                  {paymentType === "wallet" && currentUser.balance_usd < pendingBooking.amount_paid && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
                      Insufficient balance. Please add funds to your wallet.
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowPayment(false)}
                    variant="outline"
                    className="flex-1 bg-white/5"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handlePaymentSuccess}
                    disabled={paymentType === "wallet" && currentUser.balance_usd < pendingBooking.amount_paid}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    Pay ${pendingBooking.amount_paid.toFixed(2)}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Details */}
            {step === 2 && !showPayment && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <h4 className="text-white font-semibold mb-3">Booking Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-300">
                        <span>Date:</span>
                        <span className="text-white font-medium">{formatDate(selectedDate)}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Time:</span>
                        <span className="text-white font-medium">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Duration:</span>
                        <span className="text-white font-medium">{duration} hour{duration > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between text-gray-300 pt-2 border-t border-white/10">
                        <span>Total:</span>
                        <span className="text-purple-400 font-bold text-lg">${(service.price * duration).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <label className="text-white font-semibold mb-3 block flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-400" />
                    Service Location
                  </label>
                  <div className="space-y-3">
                    <button
                      onClick={() => setLocationType('provider_location')}
                      className={`w-full p-4 rounded-xl text-left transition ${
                        locationType === 'provider_location'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-medium">Provider's Location</div>
                      <div className="text-sm opacity-80">{service.location || 'Address provided after booking'}</div>
                    </button>
                    <button
                      onClick={() => setLocationType('customer_location')}
                      className={`w-full p-4 rounded-xl text-left transition ${
                        locationType === 'customer_location'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-medium">My Location (Mobile Service)</div>
                      <div className="text-sm opacity-80">Provider comes to you</div>
                    </button>
                  </div>
                  {locationType === 'customer_location' && (
                    <Input
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Enter your full address"
                      className="mt-3 bg-white/10 border-white/20 text-white"
                    />
                  )}
                </div>

                <div>
                  <label className="text-white font-semibold mb-3 block">Contact Information</label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <Input
                        value={contactInfo.name}
                        onChange={(e) => setContactInfo({...contactInfo, name: e.target.value})}
                        placeholder="Full Name"
                        className="bg-transparent border-0 text-white"
                      />
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <Input
                        value={contactInfo.phone}
                        onChange={(e) => setContactInfo({...contactInfo, phone: e.target.value})}
                        placeholder="Phone Number"
                        className="bg-transparent border-0 text-white"
                      />
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <Input
                        value={contactInfo.email}
                        readOnly
                        className="bg-transparent border-0 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-white font-semibold mb-3 block">Special Requests (Optional)</label>
                  <Textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Any specific requirements or questions..."
                    rows={3}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                {!joinWaitingList && (
                  <div>
                    <label className="text-white font-semibold mb-3 block">Payment Option</label>
                    <div className="space-y-3">
                      <button
                        onClick={() => setPaymentOption('full')}
                        className={`w-full p-4 rounded-xl text-left transition ${
                          paymentOption === 'full'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-medium">Pay in Full</div>
                        <div className="text-sm opacity-80">Pay ${(service.price * duration).toFixed(2)} now</div>
                      </button>
                      
                      <button
                        onClick={() => setPaymentOption('layaway')}
                        className={`w-full p-4 rounded-xl text-left transition ${
                          paymentOption === 'layaway'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-medium flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Layaway (25% deposit)
                        </div>
                        <div className="text-sm opacity-80">
                          Pay ${((service.price * duration) * 0.25).toFixed(2)} now, rest later
                        </div>
                      </button>
                      
                      <button
                        onClick={() => setPaymentOption('group')}
                        className={`w-full p-4 rounded-xl text-left transition ${
                          paymentOption === 'group'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-medium flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Group Funding
                        </div>
                        <div className="text-sm opacity-80">Split cost with friends</div>
                      </button>
                      
                      {paymentOption === 'group' && (
                        <div className="bg-white/5 rounded-xl p-4">
                          <label className="text-white text-sm mb-2 block">Number of people splitting:</label>
                          <Input
                            type="number"
                            min="2"
                            max="10"
                            value={groupSize}
                            onChange={(e) => setGroupSize(Number(e.target.value))}
                            className="bg-white/10 border-white/20 text-white"
                          />
                          <p className="text-gray-400 text-xs mt-2">
                            Each person pays: ${((service.price * duration) / groupSize).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1 bg-white/5"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createBookingMutation.isLoading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    {createBookingMutation.isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-3">
                  {joinWaitingList ? 'Added to Waiting List!' : 'Booking Confirmed!'}
                </h3>
                <p className="text-gray-300 mb-6">
                  {joinWaitingList 
                    ? "You've been added to the waiting list. We'll notify you when a slot opens up!"
                    : paymentOption === 'group'
                    ? "Your group booking has been created! Share the booking link with friends to split the cost."
                    : paymentOption === 'layaway'
                    ? `Deposit of $${((service.price * duration) * 0.25).toFixed(2)} received. Remaining balance due before appointment.`
                    : "Your appointment has been successfully booked. Confirmation emails have been sent to you and the provider."
                  }
                </p>
                <Card className="bg-white/5 border-white/10 mb-6">
                  <CardContent className="p-6">
                    <div className="space-y-3 text-left">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Service:</span>
                        <span className="text-white font-medium">{service.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Date:</span>
                        <span className="text-white font-medium">{formatDate(selectedDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Time:</span>
                        <span className="text-white font-medium">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Duration:</span>
                        <span className="text-white font-medium">{duration}h</span>
                      </div>
                      <div className="flex justify-between pt-3 border-t border-white/10">
                        <span className="text-gray-400">Total:</span>
                        <span className="text-purple-400 font-bold text-xl">${(service.price * duration).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Button
                  onClick={onClose}
                  className="w-full bg-purple-600 hover:bg-purple-700 py-6"
                >
                  Done
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>
  );
}
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Users, Clock, CheckCircle, XCircle, TicketCheck, Star, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function MyBookings() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("upcoming");
  const [cancelModal, setCancelModal] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const { data: experienceBookings = [], isLoading: loadingExp } = useQuery({
    queryKey: ['my-experience-bookings'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.Booking.filter({ created_by: user.email });
    },
    initialData: []
  });

  const { data: serviceBookings = [], isLoading: loadingSvc } = useQuery({
    queryKey: ['my-service-bookings'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.ServiceBooking.filter({ customer_email: user.email });
    },
    initialData: []
  });

  const allBookings = [
    ...experienceBookings.map(b => ({ ...b, type: 'experience', title: b.experience_title })),
    ...serviceBookings.map(b => ({ ...b, type: 'service', title: b.service_title, booking_status: b.status }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const isLoading = loadingExp || loadingSvc;

  const cancelBookingMutation = useMutation({
    mutationFn: async ({ id, type }) => {
      if (type === 'experience') {
        await base44.entities.Booking.update(id, { booking_status: "cancelled" });
      } else {
        await base44.entities.ServiceBooking.update(id, { status: "cancelled" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-experience-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-service-bookings'] });
      setCancelModal(null);
      toast.success('Booking cancelled');
    }
  });

  const rescheduleBookingMutation = useMutation({
    mutationFn: async ({ id, type, date }) => {
      if (type === 'experience') {
        await base44.entities.Booking.update(id, { booking_date: date, booking_status: 'pending' });
      } else {
        await base44.entities.ServiceBooking.update(id, { booking_date: date, status: 'pending' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-experience-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-service-bookings'] });
      setRescheduleModal(null);
      toast.success('Reschedule request sent');
    }
  });

  const submitReviewMutation = useMutation({
    mutationFn: async ({ id, type, rating, review }) => {
      if (type === 'service') {
        await base44.entities.ServiceBooking.update(id, { rating, review });
      }
      // Could add review entity creation here
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-service-bookings'] });
      setReviewModal(null);
      setRating(0);
      setReview("");
      toast.success('Review submitted');
    }
  });

  const getCancellationPolicy = (booking) => {
    const bookingDate = new Date(booking.booking_date);
    const today = new Date();
    const daysUntil = Math.ceil((bookingDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntil >= 7) return { refund: 100, message: "Full refund available" };
    if (daysUntil >= 3) return { refund: 50, message: "50% refund available" };
    return { refund: 0, message: "No refund available" };
  };

  const now = new Date();
  const filteredBookings = (() => {
    switch (filter) {
      case "upcoming":
        return allBookings.filter(b => 
          new Date(b.booking_date) >= now && 
          (b.booking_status === 'confirmed' || b.booking_status === 'pending')
        );
      case "past":
        return allBookings.filter(b => 
          new Date(b.booking_date) < now || 
          b.booking_status === 'completed'
        );
      case "cancelled":
        return allBookings.filter(b => b.booking_status === 'cancelled');
      case "all":
      default:
        return allBookings;
    }
  })();

  const statusColors = {
    confirmed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800"
  };

  const statusIcons = {
    confirmed: CheckCircle,
    pending: Clock,
    cancelled: XCircle,
    completed: TicketCheck
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">My Bookings</h1>

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {['upcoming', 'past', 'cancelled', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-3 rounded-full font-medium capitalize whitespace-nowrap transition ${
                filter === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {status}
              {status === 'upcoming' && (
                <Badge className="ml-2 bg-white/20">
                  {allBookings.filter(b => 
                    new Date(b.booking_date) >= now && 
                    (b.booking_status === 'confirmed' || b.booking_status === 'pending')
                  ).length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        <div className="grid md:grid-cols-2 gap-6">
          {filteredBookings.map((booking, idx) => {
            const StatusIcon = statusIcons[booking.booking_status];
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white text-xl mb-1">
                          {booking.title}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {booking.type === 'experience' ? 'Experience' : 'Service'}
                        </Badge>
                      </div>
                      <Badge className={statusColors[booking.booking_status]}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {booking.booking_status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(booking.booking_date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</span>
                      </div>
                      {booking.booking_time && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Clock className="w-4 h-4" />
                          <span>{booking.booking_time}</span>
                        </div>
                      )}
                      {booking.number_of_guests && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Users className="w-4 h-4" />
                          <span>{booking.number_of_guests} {booking.number_of_guests === 1 ? 'guest' : 'guests'}</span>
                        </div>
                      )}
                      {booking.confirmation_code && (
                        <div className="flex items-center gap-2 text-purple-400 font-mono">
                          <TicketCheck className="w-4 h-4" />
                          <span>{booking.confirmation_code}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Total Paid</span>
                        <span className="text-white font-bold text-lg">
                          ${(booking.total_price_usd || booking.total_price || 0).toLocaleString()}
                        </span>
                      </div>
                      {booking.total_price_soflo > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400 text-sm">or</span>
                          <span className="text-purple-400 text-sm">
                            {booking.total_price_soflo} SFC
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between mt-2">
                        <span className="text-gray-400 text-sm">Payment</span>
                        <span className="text-green-400 text-sm capitalize">
                          {booking.payment_status || 'paid'}
                        </span>
                      </div>
                    </div>

                    {booking.special_requests && (
                      <div className="text-gray-400 text-sm">
                        <span className="font-semibold">Special Requests:</span> {booking.special_requests}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {(booking.booking_status === "confirmed" || booking.booking_status === "pending") && 
                       new Date(booking.booking_date) > now && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-400 border-blue-400 hover:bg-blue-500/20"
                              onClick={() => setRescheduleModal(booking)}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Reschedule
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-400 border-red-400 hover:bg-red-500/20"
                              onClick={() => setCancelModal(booking)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </>
                      )}
                      
                      {booking.booking_status === "completed" && !booking.rating && booking.type === 'service' && (
                        <Button
                          size="sm"
                          className="w-full bg-yellow-600 hover:bg-yellow-700"
                          onClick={() => setReviewModal(booking)}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Leave Review
                        </Button>
                      )}
                      
                      {booking.rating && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-1 mb-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i < booking.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} 
                              />
                            ))}
                          </div>
                          {booking.review && (
                            <p className="text-gray-300 text-sm">{booking.review}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredBookings.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No bookings found</h3>
            <p className="text-gray-400 mb-6">
              {filter === "all" 
                ? "You haven't made any bookings yet" 
                : `No ${filter} bookings`}
            </p>
            <Button
              onClick={() => window.location.href = '/explore'}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Explore Experiences
            </Button>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setCancelModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Cancel Booking</h3>
                  <p className="text-gray-400 text-sm">Review cancellation policy</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <p className="text-white font-semibold mb-2">{cancelModal.title}</p>
                <p className="text-gray-400 text-sm mb-3">
                  {new Date(cancelModal.booking_date).toLocaleDateString()}
                </p>
                
                {(() => {
                  const policy = getCancellationPolicy(cancelModal);
                  return (
                    <div className={`p-3 rounded-lg ${
                      policy.refund === 100 ? 'bg-green-500/10 border border-green-500/30' :
                      policy.refund === 50 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                      'bg-red-500/10 border border-red-500/30'
                    }`}>
                      <p className={`font-semibold ${
                        policy.refund === 100 ? 'text-green-400' :
                        policy.refund === 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {policy.message}
                      </p>
                      {policy.refund > 0 && (
                        <p className="text-gray-300 text-sm mt-1">
                          You will receive ${((cancelModal.total_price_usd || cancelModal.total_price || 0) * policy.refund / 100).toFixed(2)} back
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCancelModal(null)}
                >
                  Keep Booking
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={() => cancelBookingMutation.mutate({ 
                    id: cancelModal.id, 
                    type: cancelModal.type 
                  })}
                  disabled={cancelBookingMutation.isLoading}
                >
                  Confirm Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {rescheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setRescheduleModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Reschedule Booking</h3>
                  <p className="text-gray-400 text-sm">Select a new date</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Current Date</label>
                  <div className="bg-white/5 rounded-lg p-3 text-white">
                    {new Date(rescheduleModal.booking_date).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">New Date</label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm">
                    Reschedule request will be sent to the provider for approval
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setRescheduleModal(null);
                    setRescheduleDate("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={!rescheduleDate || rescheduleBookingMutation.isLoading}
                  onClick={() => rescheduleBookingMutation.mutate({
                    id: rescheduleModal.id,
                    type: rescheduleModal.type,
                    date: rescheduleDate
                  })}
                >
                  Submit Request
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setReviewModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Leave a Review</h3>
                  <p className="text-gray-400 text-sm">{reviewModal.title}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="transition hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Your Review</label>
                  <Textarea
                    placeholder="Share your experience..."
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setReviewModal(null);
                    setRating(0);
                    setReview("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                  disabled={rating === 0 || submitReviewMutation.isLoading}
                  onClick={() => submitReviewMutation.mutate({
                    id: reviewModal.id,
                    type: reviewModal.type,
                    rating,
                    review
                  })}
                >
                  Submit Review
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
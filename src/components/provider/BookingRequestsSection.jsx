import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, MapPin, Calendar, User, MessageSquare, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function BookingRequestsSection({ currentUser }) {
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [providerNotes, setProviderNotes] = useState("");
  const [generatingResponse, setGeneratingResponse] = useState(false);

  const { data: bookingRequests = [] } = useQuery({
    queryKey: ['provider-booking-requests', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.ServiceBooking.filter({
        provider_email: currentUser.email,
        status: 'pending'
      }, '-created_date');
    },
    enabled: !!currentUser
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, status, notes }) => {
      return await base44.entities.ServiceBooking.update(bookingId, {
        status,
        provider_notes: notes
      });
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries(['provider-booking-requests']);
      queryClient.invalidateQueries(['provider-bookings']);
      setSelectedBooking(null);
      
      const booking = bookingRequests.find(b => b.id === variables.bookingId);
      
      // Send notification to customer
      await base44.entities.Notification.create({
        recipient_email: booking.customer_email,
        type: 'booking_confirmed',
        title: variables.status === 'confirmed' ? 'Booking Confirmed!' : 'Booking Declined',
        message: variables.status === 'confirmed' 
          ? `Your booking for ${booking.service_title} has been confirmed.`
          : `Your booking request for ${booking.service_title} was declined.`,
        reference_type: 'booking',
        reference_id: variables.bookingId
      });

      toast.success(variables.status === 'confirmed' ? 'Booking confirmed!' : 'Booking declined');
    }
  });

  const handleAccept = (booking) => {
    updateBookingMutation.mutate({
      bookingId: booking.id,
      status: 'confirmed',
      notes: providerNotes
    });
  };

  const handleDecline = (booking) => {
    updateBookingMutation.mutate({
      bookingId: booking.id,
      status: 'cancelled',
      notes: providerNotes
    });
  };

  const generateResponse = async (booking, type) => {
    setGeneratingResponse(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional service provider drafting a ${type === 'accept' ? 'acceptance' : 'decline'} message to a customer.

Service: ${booking.service_title}
Customer: ${booking.customer_email}
Date: ${new Date(booking.booking_date).toLocaleDateString()}
Time: ${booking.booking_time}
Customer Notes: ${booking.customer_notes || 'None'}

Draft a ${type === 'accept' ? 'warm, professional acceptance message confirming the booking' : 'polite, professional decline message'}.

The message should:
- Be 2-3 sentences
- ${type === 'accept' ? 'Confirm the details and express enthusiasm' : 'Be apologetic and suggest the customer reach out for future availability'}
- Be friendly and professional
- Sound human, not robotic

Generate only the message text, no subject line or greetings.`,
        add_context_from_internet: false
      });
      
      setProviderNotes(response);
      toast.success('Response drafted!');
    } catch (error) {
      toast.error('Failed to generate response');
    } finally {
      setGeneratingResponse(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Pending Booking Requests</h3>
        <Badge className="bg-purple-500/20 text-purple-300">
          {bookingRequests.length} pending
        </Badge>
      </div>

      {bookingRequests.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No pending requests</h3>
            <p className="text-gray-400">New booking requests will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {bookingRequests.map((booking) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
              >
                <Card className="bg-white/5 border-white/10 hover:border-purple-500/30 transition">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-white font-bold text-lg mb-2">{booking.service_title}</h4>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <User className="w-4 h-4" />
                            <span>{booking.customer_email}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}
                            </span>
                          </div>
                          
                          {booking.location && (
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                              <MapPin className="w-4 h-4" />
                              <span>{booking.location}</span>
                            </div>
                          )}
                        </div>

                        {booking.customer_notes && (
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5" />
                              <div>
                                <p className="text-blue-300 text-sm font-medium mb-1">Customer Notes:</p>
                                <p className="text-blue-200 text-sm">{booking.customer_notes}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right ml-4">
                        <div className="text-green-400 text-2xl font-bold mb-1">
                          ${booking.total_price}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {booking.duration_hours}h booking
                        </div>
                      </div>
                    </div>

                    {selectedBooking === booking.id && (
                      <div className="mb-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-gray-400 text-sm">Message to Customer (Optional)</label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => generateResponse(booking, 'accept')}
                              disabled={generatingResponse}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              {generatingResponse ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  AI Accept
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => generateResponse(booking, 'decline')}
                              disabled={generatingResponse}
                              variant="outline"
                              className="bg-white/5 border-white/10"
                            >
                              {generatingResponse ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  AI Decline
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          value={providerNotes}
                          onChange={(e) => setProviderNotes(e.target.value)}
                          placeholder="Add any notes for the customer..."
                          className="bg-white/10 border-white/20 text-white"
                          rows={3}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={() => {
                          if (selectedBooking === booking.id) {
                            handleDecline(booking);
                          } else {
                            setSelectedBooking(booking.id);
                          }
                        }}
                        variant="outline"
                        className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                        disabled={updateBookingMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Decline
                      </Button>

                      <Button
                        onClick={() => {
                          const conversationId = `${currentUser.email}_${booking.customer_email}`.split('').sort().join('');
                          // Navigate to messages tab and select conversation - simplified approach
                          toast.info('Opening messages...');
                        }}
                        variant="outline"
                        className="bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                      
                      <Button
                        onClick={() => {
                          if (selectedBooking === booking.id) {
                            handleAccept(booking);
                          } else {
                            setSelectedBooking(booking.id);
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={updateBookingMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {selectedBooking === booking.id ? 'Confirm' : 'Accept'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Star, MessageCircle, X, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CustomerBookings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['customer-bookings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ServiceBooking.filter({
        customer_email: currentUser.email
      });
    },
    enabled: !!currentUser,
    refetchInterval: 10000
  });

  // Real-time booking updates
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = base44.entities.ServiceBooking.subscribe((event) => {
      if (event.data?.customer_email === currentUser.email) {
        queryClient.invalidateQueries(['customer-bookings']);
        
        // Show toast for status changes
        if (event.type === 'update' && event.data.status) {
          const statusMessages = {
            confirmed: '✅ Your booking has been confirmed!',
            cancelled: '❌ Your booking has been cancelled',
            rescheduled: '📅 Your booking has been rescheduled',
            completed: '✨ Your booking is complete!'
          };
          
          const message = statusMessages[event.data.status];
          if (message) {
            toast.success(message);
            
            if (window.NativeAppBridge?.triggerHaptic) {
              window.NativeAppBridge.triggerHaptic('medium');
            }
          }
        }
      }
    });
    
    return unsubscribe;
  }, [currentUser]);

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId) => {
      // Get booking first
      const booking = bookings.find(b => b.id === bookingId);
      
      // Use the new updateBookingStatus function
      const response = await base44.functions.invoke('updateBookingStatus', {
        bookingId,
        newStatus: 'cancelled',
        reason: 'Cancelled by customer'
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to cancel booking');
      }

      return booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-bookings']);
      
      // Success haptic
      if (window.NativeAppBridge?.triggerHaptic) {
        window.NativeAppBridge.triggerHaptic('success');
      }
      
      toast.success('Booking cancelled successfully');
      setSelectedBooking(null);
    },
    onError: (error) => {
      // Error haptic
      if (window.NativeAppBridge?.triggerHaptic) {
        window.NativeAppBridge.triggerHaptic('error');
      }
      
      toast.error('Failed to cancel booking: ' + error.message);
    }
  });

  const upcomingBookings = bookings.filter(b => 
    new Date(b.booking_date) >= new Date() && 
    (b.status === 'pending' || b.status === 'confirmed')
  );

  const pastBookings = bookings.filter(b => 
    new Date(b.booking_date) < new Date() || 
    b.status === 'completed' || 
    b.status === 'cancelled'
  );

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      confirmed: 'bg-green-500/20 text-green-300 border-green-500/30',
      completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      cancelled: 'bg-red-500/20 text-red-300 border-red-500/30'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  const BookingCard = ({ booking }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all cursor-pointer"
      onClick={() => setSelectedBooking(booking)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg mb-2">{booking.service_title}</h3>
          <p className="text-gray-400 text-sm mb-1">{booking.provider_name}</p>
        </div>
        <Badge className={getStatusColor(booking.status)}>
          {booking.status}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-300">
          <Calendar className="w-4 h-4" />
          {new Date(booking.booking_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <Clock className="w-4 h-4" />
          {booking.booking_time}
        </div>
        {booking.location && (
          <div className="flex items-center gap-2 text-gray-300">
            <MapPin className="w-4 h-4" />
            {booking.location}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
        <span className="text-white font-bold text-xl">${booking.total_price}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            if (window.NativeAppBridge?.triggerHaptic) {
              window.NativeAppBridge.triggerHaptic('light');
            }
            navigate(createPageUrl("Messages") + `?user=${booking.provider_email}`);
          }}
          className="bg-white/5 border-white/20 text-white min-h-[36px]"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Message
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Bookings</h1>
          <Button
            onClick={() => navigate(createPageUrl("Marketplace"))}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Browse Services
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-white mb-1">{upcomingBookings.length}</div>
              <div className="text-purple-300 text-sm">Upcoming</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-white mb-1">
                {bookings.filter(b => b.status === 'confirmed').length}
              </div>
              <div className="text-green-300 text-sm">Confirmed</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-white mb-1">
                {bookings.filter(b => b.status === 'completed').length}
              </div>
              <div className="text-blue-300 text-sm">Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-white mb-1">
                {bookings.filter(b => b.status === 'pending').length}
              </div>
              <div className="text-yellow-300 text-sm">Pending</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="bg-white/10 border border-white/20">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <div className="text-gray-400">Loading bookings...</div>
                </CardContent>
              </Card>
            ) : upcomingBookings.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No Upcoming Bookings</h3>
                  <p className="text-gray-400 mb-6">Start exploring services and book your first appointment!</p>
                  <Button
                    onClick={() => navigate(createPageUrl("Marketplace"))}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Browse Services
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {upcomingBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastBookings.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No Past Bookings</h3>
                  <p className="text-gray-400">Your booking history will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {pastBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Booking Details</h3>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-gray-400 hover:text-white transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-white font-bold text-xl mb-2">{selectedBooking.service_title}</h4>
                      <p className="text-gray-400">{selectedBooking.provider_name}</p>
                    </div>
                    <Badge className={getStatusColor(selectedBooking.status)}>
                      {selectedBooking.status}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-300">
                      <Calendar className="w-5 h-5" />
                      <span>
                        {new Date(selectedBooking.booking_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-300">
                      <Clock className="w-5 h-5" />
                      <span>{selectedBooking.booking_time}</span>
                    </div>
                    {selectedBooking.location && (
                      <div className="flex items-center gap-3 text-gray-300">
                        <MapPin className="w-5 h-5" />
                        <span>{selectedBooking.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedBooking.notes && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h5 className="text-white font-semibold mb-2">Notes</h5>
                    <p className="text-gray-300 text-sm">{selectedBooking.notes}</p>
                  </div>
                )}

                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Amount</span>
                    <span className="text-white font-bold text-2xl">${selectedBooking.total_price}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  {(selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (
                    <Button
                      onClick={() => {
                        if (window.NativeAppBridge?.triggerHaptic) {
                          window.NativeAppBridge.triggerHaptic('warning');
                        }
                        if (confirm(`Are you sure you want to cancel this booking?\n\nService: ${selectedBooking.service_title}\nDate: ${new Date(selectedBooking.booking_date).toLocaleDateString()}\nTime: ${selectedBooking.booking_time}\n\nThis action cannot be undone.`)) {
                          cancelBookingMutation.mutate(selectedBooking.id);
                        }
                      }}
                      disabled={cancelBookingMutation.isPending}
                      variant="outline"
                      className="flex-1 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 min-h-[44px]"
                    >
                      {cancelBookingMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      if (window.NativeAppBridge?.triggerHaptic) {
                        window.NativeAppBridge.triggerHaptic('light');
                      }
                      setSelectedBooking(null);
                      navigate(createPageUrl("Messages") + `?user=${selectedBooking.provider_email}`);
                    }}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message Provider
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
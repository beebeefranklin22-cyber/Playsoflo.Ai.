import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, DollarSign, Star, MessageSquare, Loader2 } from "lucide-react";
import ServiceReviewModal from "../components/reviews/ServiceReviewModal";

export default function MyBookings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.log("User not authenticated");
      }
    };
    fetchUser();
  }, []);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings', currentUser?.email],
    queryFn: async () => {
      return await base44.entities.ServiceBooking.filter({
        customer_email: currentUser.email
      }, '-created_date');
    },
    enabled: !!currentUser
  });

  const upcomingBookings = bookings.filter(b => 
    new Date(b.booking_date) >= new Date() && 
    (b.status === 'pending' || b.status === 'confirmed')
  );

  const completedBookings = bookings.filter(b => b.status === 'completed');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'completed': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const BookingCard = ({ booking }) => (
    <Card className="bg-white/5 border-white/10 hover:border-purple-500/30 transition">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-2">{booking.service_title}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
              </div>
              {booking.booking_time && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{booking.booking_time}</span>
                </div>
              )}
              {booking.location && (
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>{booking.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-green-400 font-bold">
                <DollarSign className="w-4 h-4" />
                <span>${booking.total_price}</span>
              </div>
            </div>
          </div>
          <Badge className={getStatusColor(booking.status)}>
            {booking.status}
          </Badge>
        </div>

        {booking.special_requirements && (
          <div className="mb-4 p-3 bg-white/5 rounded-lg">
            <p className="text-gray-400 text-sm">{booking.special_requirements}</p>
          </div>
        )}

        <div className="flex gap-2">
          {booking.status === 'completed' && !booking.review_submitted && (
            <Button
              onClick={() => {
                setSelectedBooking(booking);
                setShowReviewModal(true);
              }}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Star className="w-4 h-4 mr-2" />
              Leave Review
            </Button>
          )}
          {booking.status === 'completed' && booking.review_submitted && (
            <Button
              disabled
              className="flex-1 bg-green-500/20 text-green-300 border border-green-500/30"
            >
              <Star className="w-4 h-4 mr-2 fill-green-300" />
              Review Submitted
            </Button>
          )}
          <Button
            variant="outline"
            className="bg-white/5 border-white/10 hover:bg-white/10"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Provider
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-950 to-blue-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-gray-950 to-blue-950 p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">My Bookings</h1>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="bg-white/10 border border-white/20">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({cancelledBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400">No upcoming bookings</p>
                </CardContent>
              </Card>
            ) : (
              upcomingBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedBookings.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Star className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400">No completed bookings</p>
                </CardContent>
              </Card>
            ) : (
              completedBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {cancelledBookings.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400">No cancelled bookings</p>
                </CardContent>
              </Card>
            ) : (
              cancelledBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Modal */}
      {selectedBooking && (
        <ServiceReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedBooking(null);
          }}
          booking={selectedBooking}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
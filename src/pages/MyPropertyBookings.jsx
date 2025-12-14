import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, Calendar, MapPin, Users, DollarSign,
  MessageCircle, Star, Home, XCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import PropertyMessaging from "../components/property/PropertyMessaging";
import PropertyReviewModal from "../components/property/PropertyReviewModal";
import UserBookingsCalendar from "../components/property/UserBookingsCalendar";
import BookingCancellationModal from "../components/property/BookingCancellationModal";

export default function MyPropertyBookings() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedBookingForChat, setSelectedBookingForChat] = useState(null);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [cancelProperty, setCancelProperty] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: bookings = [] } = useQuery({
    queryKey: ["my-property-bookings", currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.Booking.filter({
        created_by: currentUser.email,
        booking_type: "property"
      });
    },
    enabled: !!currentUser
  });

  const upcomingBookings = bookings.filter(
    b => new Date(b.booking_date) >= new Date() && 
    (b.booking_status === "confirmed" || b.booking_status === "pending")
  );

  const pastBookings = bookings.filter(
    b => b.booking_status === "completed" ||
    (new Date(b.checkout_date || b.booking_date) < new Date() && b.booking_status === "confirmed")
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950 to-gray-950 p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">My Bookings</h1>
            <p className="text-gray-300">View and manage your property bookings</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/10 border border-white/20 mb-6">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Upcoming ({upcomingBookings.length})
            </h2>
            {upcomingBookings.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No upcoming bookings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {upcomingBookings.map((booking) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-white font-bold text-lg mb-2">
                              {booking.experience_title}
                            </h3>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {new Date(booking.booking_date).toLocaleDateString()} -
                                  {booking.checkout_date && ` ${new Date(booking.checkout_date).toLocaleDateString()}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Users className="w-4 h-4" />
                                <span>{booking.number_of_guests} guest{booking.number_of_guests > 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          </div>
                          <Badge className={
                            booking.booking_status === "confirmed"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }>
                            {booking.booking_status}
                          </Badge>
                        </div>

                        <div className="bg-white/5 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Total</span>
                            <span className="text-white font-bold text-xl">
                              ${booking.total_price_usd}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedBookingForChat(booking)}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(createPageUrl("PropertyHostProfile") + `?host=${booking.provider_email}`)}
                          >
                            <Home className="w-4 h-4 mr-2" />
                            Host
                          </Button>
                          {booking.booking_status === "confirmed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const properties = await base44.entities.Property.filter({ id: booking.experience_id });
                                setCancelProperty(properties[0]);
                                setSelectedBookingForCancel(booking);
                              }}
                              className="col-span-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel Booking
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          </TabsContent>

          <TabsContent value="past" className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Past Stays ({pastBookings.length})
            </h2>
            {pastBookings.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No past bookings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {pastBookings.map((booking) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <h3 className="text-white font-bold text-lg mb-3">
                          {booking.experience_title}
                        </h3>
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                        </div>

                        {booking.rating ? (
                          <div className="bg-white/5 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              <span className="text-white font-semibold">
                                {booking.rating}/5
                              </span>
                            </div>
                            {booking.review_text && (
                              <p className="text-gray-400 text-sm">{booking.review_text}</p>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedBookingForReview(booking)}
                            className="w-full mb-3"
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Leave a Review
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedBookingForChat(booking)}
                          className="w-full"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          View Messages
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <UserBookingsCalendar bookings={bookings} />
          </TabsContent>
        </Tabs>

        {/* Chat Modal */}
        {selectedBookingForChat && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90"
            onClick={() => setSelectedBookingForChat(null)}
          >
            <div
              className="w-full max-w-2xl bg-gray-900 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                onClick={() => setSelectedBookingForChat(null)}
                className="mb-4"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <PropertyMessaging
                booking={selectedBookingForChat}
                currentUser={currentUser}
                isHost={false}
              />
            </div>
          </div>
        )}

        {/* Review Modal */}
        {selectedBookingForReview && (
          <PropertyReviewModal
            booking={selectedBookingForReview}
            onClose={() => setSelectedBookingForReview(null)}
            isHost={false}
          />
        )}

        {/* Cancellation Modal */}
        {selectedBookingForCancel && cancelProperty && (
          <BookingCancellationModal
            booking={selectedBookingForCancel}
            property={cancelProperty}
            onClose={() => {
              setSelectedBookingForCancel(null);
              setCancelProperty(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
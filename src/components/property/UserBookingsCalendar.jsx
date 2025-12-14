import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, MapPin, DollarSign, Users } from "lucide-react";

export default function UserBookingsCalendar({ bookings }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Get all dates with bookings
  const getBookedDates = () => {
    const dates = [];
    bookings.forEach((booking) => {
      if (booking.booking_status !== "cancelled") {
        const checkIn = new Date(booking.booking_date);
        const checkOut = booking.checkout_date ? new Date(booking.checkout_date) : new Date(checkIn);
        
        const current = new Date(checkIn);
        while (current <= checkOut) {
          dates.push({
            date: new Date(current),
            booking: booking
          });
          current.setDate(current.getDate() + 1);
        }
      }
    });
    return dates;
  };

  const bookedDates = getBookedDates();

  const getBookingsForDate = (date) => {
    return bookedDates
      .filter(item => item.date.toDateString() === date.toDateString())
      .map(item => item.booking);
  };

  const selectedDateBookings = getBookingsForDate(selectedDate);

  // Create modifiers for calendar
  const modifierDates = bookedDates.map(item => item.date);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Your Bookings Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{
              booked: modifierDates
            }}
            modifiersStyles={{
              booked: {
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                color: "white",
                fontWeight: "bold",
                border: "2px solid rgba(16, 185, 129, 0.5)"
              }
            }}
            className="bg-white/5 rounded-xl border border-white/10 p-3"
          />
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500/20 rounded border-2 border-emerald-500/50" />
              <span className="text-gray-400 text-sm">Booked dates</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">
            {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateBookings.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No bookings on this date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDateBookings.map((booking) => (
                <div key={booking.id} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-bold mb-1">{booking.experience_title}</h4>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <MapPin className="w-3 h-3" />
                        <span>Check-in: {new Date(booking.booking_date).toLocaleDateString()}</span>
                      </div>
                      {booking.checkout_date && (
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <MapPin className="w-3 h-3" />
                          <span>Check-out: {new Date(booking.checkout_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <Badge className={
                      booking.booking_status === "confirmed"
                        ? "bg-green-500/20 text-green-400"
                        : booking.booking_status === "pending"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-blue-500/20 text-blue-400"
                    }>
                      {booking.booking_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {booking.number_of_guests} guest{booking.number_of_guests > 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ${booking.total_price_usd}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Check, Clock, X } from "lucide-react";

export default function PropertyCalendar({ bookings, properties }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Get all booked dates
  const getBookedDates = () => {
    const bookedDates = [];
    bookings.forEach((booking) => {
      if (booking.booking_status === "confirmed" || booking.booking_status === "pending") {
        const checkIn = new Date(booking.booking_date);
        const checkOut = booking.checkout_date ? new Date(booking.checkout_date) : new Date(checkIn);
        
        // Add all dates between check-in and check-out
        const current = new Date(checkIn);
        while (current <= checkOut) {
          bookedDates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
      }
    });
    return bookedDates;
  };

  const bookedDates = getBookedDates();

  const isDateBooked = (date) => {
    return bookedDates.some(
      (bookedDate) =>
        bookedDate.toDateString() === date.toDateString()
    );
  };

  const getBookingsForDate = (date) => {
    return bookings.filter((booking) => {
      const checkIn = new Date(booking.booking_date);
      const checkOut = booking.checkout_date ? new Date(booking.checkout_date) : checkIn;
      return date >= checkIn && date <= checkOut;
    });
  };

  const selectedDateBookings = getBookingsForDate(selectedDate);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Booking Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{
              booked: bookedDates,
            }}
            modifiersStyles={{
              booked: {
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                color: "white",
                fontWeight: "bold",
              },
            }}
            className="bg-white/5 rounded-xl border border-white/10 p-3"
          />
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500/20 rounded border border-red-500/30" />
              <span className="text-gray-400 text-sm">Booked/Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white/10 rounded border border-white/20" />
              <span className="text-gray-400 text-sm">Available</span>
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
            <div className="text-center py-8">
              <Check className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-400">No bookings on this date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateBookings.map((booking) => {
                const property = properties?.find(p => p.id === booking.experience_id);
                return (
                  <div key={booking.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-white font-bold">{booking.experience_title}</h4>
                        <p className="text-gray-400 text-sm">
                          {new Date(booking.booking_date).toLocaleDateString()} - {
                            booking.checkout_date 
                              ? new Date(booking.checkout_date).toLocaleDateString()
                              : "N/A"
                          }
                        </p>
                      </div>
                      <Badge className={
                        booking.booking_status === "confirmed"
                          ? "bg-green-500/20 text-green-400"
                          : booking.booking_status === "pending"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : booking.booking_status === "cancelled"
                          ? "bg-red-500/20 text-red-400"
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
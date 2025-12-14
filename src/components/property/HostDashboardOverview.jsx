import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, Users, DollarSign, TrendingUp, 
  Clock, CheckCircle, XCircle, Home
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function HostDashboardOverview({ bookings, properties }) {
  const navigate = useNavigate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Check-ins today
  const checkInsToday = bookings.filter(b => {
    const checkIn = new Date(b.booking_date);
    checkIn.setHours(0, 0, 0, 0);
    return checkIn.getTime() === today.getTime() && b.booking_status === "confirmed";
  });

  // Check-outs today
  const checkOutsToday = bookings.filter(b => {
    if (!b.checkout_date) return false;
    const checkOut = new Date(b.checkout_date);
    checkOut.setHours(0, 0, 0, 0);
    return checkOut.getTime() === today.getTime() && b.booking_status === "confirmed";
  });

  // Upcoming this week
  const upcomingWeek = bookings.filter(b => {
    const checkIn = new Date(b.booking_date);
    return checkIn >= today && checkIn <= nextWeek && b.booking_status === "confirmed";
  });

  // Earnings this month
  const thisMonth = bookings.filter(b => {
    const bookingDate = new Date(b.created_date);
    return bookingDate.getMonth() === today.getMonth() && 
           bookingDate.getFullYear() === today.getFullYear() &&
           (b.booking_status === "confirmed" || b.booking_status === "completed");
  });

  const monthlyEarnings = thisMonth.reduce((sum, b) => sum + (b.total_price_usd || 0), 0);

  // Pending bookings
  const pendingBookings = bookings.filter(b => b.booking_status === "pending");

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-blue-400" />
              <Badge className="bg-blue-500/20 text-blue-400">Today</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{checkInsToday.length}</div>
            <div className="text-blue-300 text-sm">Check-ins Today</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-purple-400" />
              <Badge className="bg-purple-500/20 text-purple-400">Today</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{checkOutsToday.length}</div>
            <div className="text-purple-300 text-sm">Check-outs Today</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-emerald-400" />
              <Badge className="bg-emerald-500/20 text-emerald-400">This Month</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">${monthlyEarnings.toFixed(0)}</div>
            <div className="text-emerald-300 text-sm">Revenue</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-yellow-400" />
              <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{pendingBookings.length}</div>
            <div className="text-yellow-300 text-sm">Awaiting Response</div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Activities */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Check-ins Today */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-400" />
              Check-ins Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checkInsToday.length === 0 ? (
              <p className="text-gray-400 text-sm">No check-ins scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {checkInsToday.map((booking) => (
                  <div key={booking.id} className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-1">{booking.experience_title}</h4>
                    <p className="text-gray-400 text-sm mb-2">
                      {booking.number_of_guests} guest{booking.number_of_guests > 1 ? 's' : ''}
                    </p>
                    <Badge className="bg-blue-500/20 text-blue-400">
                      Check-in at 3:00 PM
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check-outs Today */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-purple-400" />
              Check-outs Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checkOutsToday.length === 0 ? (
              <p className="text-gray-400 text-sm">No check-outs scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {checkOutsToday.map((booking) => (
                  <div key={booking.id} className="bg-white/5 rounded-lg p-4">
                    <h4 className="text-white font-bold mb-1">{booking.experience_title}</h4>
                    <p className="text-gray-400 text-sm mb-2">
                      {booking.number_of_guests} guest{booking.number_of_guests > 1 ? 's' : ''}
                    </p>
                    <Badge className="bg-purple-500/20 text-purple-400">
                      Check-out by 11:00 AM
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming This Week */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Upcoming This Week ({upcomingWeek.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingWeek.length === 0 ? (
            <p className="text-gray-400 text-sm">No upcoming bookings this week</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {upcomingWeek.slice(0, 6).map((booking) => (
                <div key={booking.id} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-bold">{booking.experience_title}</h4>
                      <p className="text-gray-400 text-sm">
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400">
                      ${booking.total_price_usd}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {booking.number_of_guests} guest{booking.number_of_guests > 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {pendingBookings.length > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-lg mb-1">
                  {pendingBookings.length} Booking Request{pendingBookings.length > 1 ? 's' : ''} Pending
                </h3>
                <p className="text-gray-400 text-sm">
                  Respond quickly to increase your acceptance rate
                </p>
              </div>
              <button
                onClick={() => navigate(createPageUrl("PropertyProviderHub"))}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-xl text-white font-semibold transition"
              >
                Review Requests
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
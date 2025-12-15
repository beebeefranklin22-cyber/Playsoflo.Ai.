import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, DollarSign, Calendar, Star, TrendingUp, Users, Percent, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function PropertyDashboard({ properties, bookings }) {
  const completedBookings = bookings.filter(b => b.booking_status === 'completed');
  const upcomingBookings = bookings.filter(
    b => new Date(b.booking_date) >= new Date() && b.booking_status === 'confirmed'
  );
  const confirmedBookings = bookings.filter(b => b.booking_status === 'confirmed');

  const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.total_price_usd || 0), 0);
  const thisMonthRevenue = bookings
    .filter(b => {
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const bookingDate = new Date(b.created_date);
      return bookingDate.getMonth() === thisMonth && 
             bookingDate.getFullYear() === thisYear && 
             b.booking_status === 'completed';
    })
    .reduce((sum, b) => sum + (b.total_price_usd || 0), 0);

  const avgBookingValue = completedBookings.length > 0
    ? (totalRevenue / completedBookings.length).toFixed(2)
    : 0;

  // Calculate occupancy rate
  const totalNights = properties.reduce((sum, p) => {
    const propertyBookings = bookings.filter(
      b => b.experience_id === p.id && b.booking_status === 'completed'
    );
    return sum + propertyBookings.reduce((nights, b) => {
      const start = new Date(b.booking_date);
      const end = b.checkout_date ? new Date(b.checkout_date) : start;
      const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return nights + diff;
    }, 0);
  }, 0);

  const daysInMonth = 30;
  const totalAvailableNights = properties.length * daysInMonth;
  const occupancyRate = totalAvailableNights > 0 
    ? ((totalNights / totalAvailableNights) * 100).toFixed(1)
    : 0;

  // Reviews
  const reviewedBookings = bookings.filter(b => b.rating && b.rating > 0);
  const avgRating = reviewedBookings.length > 0
    ? (reviewedBookings.reduce((sum, b) => sum + b.rating, 0) / reviewedBookings.length).toFixed(1)
    : 0;

  const todaysCheckIns = bookings.filter(b => {
    const today = new Date().toDateString();
    return new Date(b.booking_date).toDateString() === today && b.booking_status === 'confirmed';
  });

  const todaysCheckOuts = bookings.filter(b => {
    const today = new Date().toDateString();
    return b.checkout_date && new Date(b.checkout_date).toDateString() === today;
  });

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 border-emerald-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Percent className="w-8 h-8 text-emerald-400" />
                <Badge className="bg-emerald-500/30 text-emerald-200">Live</Badge>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{occupancyRate}%</div>
              <div className="text-emerald-300 text-sm">Occupancy Rate</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <DollarSign className="w-8 h-8 text-green-400" />
                <Badge className="bg-green-500/30 text-green-200">Revenue</Badge>
              </div>
              <div className="text-4xl font-bold text-white mb-1">${thisMonthRevenue.toFixed(0)}</div>
              <div className="text-green-300 text-sm">This Month</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Star className="w-8 h-8 text-yellow-400" />
                <Badge className="bg-yellow-500/30 text-yellow-200">Rating</Badge>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{avgRating || 'N/A'}</div>
              <div className="text-yellow-300 text-sm">{reviewedBookings.length} Reviews</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Calendar className="w-8 h-8 text-blue-400" />
                <Badge className="bg-blue-500/30 text-blue-200">Upcoming</Badge>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{upcomingBookings.length}</div>
              <div className="text-blue-300 text-sm">Future Bookings</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Today's Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-green-400" />
              Today's Check-ins ({todaysCheckIns.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysCheckIns.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No check-ins today</p>
            ) : (
              <div className="space-y-2">
                {todaysCheckIns.map(booking => (
                  <div key={booking.id} className="bg-white/5 rounded-lg p-3">
                    <p className="text-white font-semibold text-sm">{booking.experience_title}</p>
                    <p className="text-gray-400 text-xs">{booking.number_of_guests} guest(s)</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              Today's Check-outs ({todaysCheckOuts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysCheckOuts.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No check-outs today</p>
            ) : (
              <div className="space-y-2">
                {todaysCheckOuts.map(booking => (
                  <div key={booking.id} className="bg-white/5 rounded-lg p-3">
                    <p className="text-white font-semibold text-sm">{booking.experience_title}</p>
                    <p className="text-gray-400 text-xs">{booking.number_of_guests} guest(s)</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Property Performance */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Home className="w-5 h-5 text-purple-400" />
            Property Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {properties.map(property => {
              const propBookings = bookings.filter(b => b.experience_id === property.id);
              const propCompleted = propBookings.filter(b => b.booking_status === 'completed');
              const propRevenue = propCompleted.reduce((sum, b) => sum + (b.total_price_usd || 0), 0);
              const propReviews = propBookings.filter(b => b.rating && b.rating > 0);
              const propRating = propReviews.length > 0
                ? (propReviews.reduce((sum, b) => sum + b.rating, 0) / propReviews.length).toFixed(1)
                : 'N/A';

              return (
                <div key={property.id} className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-bold mb-2">{property.title}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-400">Bookings</p>
                          <p className="text-white font-bold">{propCompleted.length}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Revenue</p>
                          <p className="text-green-400 font-bold">${propRevenue.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Rating</p>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-white font-bold">{propRating}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-400">Reviews</p>
                          <p className="text-white font-bold">{propReviews.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Reviews */}
      {reviewedBookings.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Recent Guest Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reviewedBookings.slice(0, 5).map(booking => (
                <div key={booking.id} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-semibold">{booking.experience_title}</h4>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-white font-bold">{booking.rating}</span>
                    </div>
                  </div>
                  {booking.review_text && (
                    <p className="text-gray-300 text-sm">{booking.review_text}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    {new Date(booking.created_date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
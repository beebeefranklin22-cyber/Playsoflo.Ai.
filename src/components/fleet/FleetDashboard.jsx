import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, DollarSign, TrendingUp, Calendar, Clock, Gauge, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function FleetDashboard({ cars, rentals }) {
  const activeRentals = rentals.filter(r => ['confirmed', 'active'].includes(r.status));
  const completedRentals = rentals.filter(r => r.status === 'completed');
  
  const totalEarnings = completedRentals.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const availableCars = cars.filter(c => c.availability === 'available');
  const rentedCars = cars.filter(c => c.availability === 'rented');
  const maintenanceCars = cars.filter(c => c.availability === 'maintenance');
  
  const utilizationRate = cars.length > 0 ? ((rentedCars.length / cars.length) * 100).toFixed(1) : 0;
  const avgDailyEarnings = completedRentals.length > 0 
    ? (totalEarnings / completedRentals.length).toFixed(2)
    : 0;

  const upcomingRentals = rentals
    .filter(r => r.status === 'confirmed' && new Date(r.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 5);

  const todaysRentals = rentals.filter(r => {
    const today = new Date().toDateString();
    return new Date(r.start_date).toDateString() === today && r.status === 'confirmed';
  });

  const thisMonthEarnings = rentals
    .filter(r => {
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const rentalDate = new Date(r.created_date);
      return rentalDate.getMonth() === thisMonth && 
             rentalDate.getFullYear() === thisYear && 
             r.status === 'completed';
    })
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Real-time Fleet Status */}
      <div className="grid md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Car className="w-8 h-8 text-green-400" />
                <Badge className="bg-green-500/30 text-green-200">Available</Badge>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{availableCars.length}</div>
              <div className="text-green-300 text-sm">Ready to Rent</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Car className="w-8 h-8 text-blue-400" />
                <Badge className="bg-blue-500/30 text-blue-200">On Rent</Badge>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{rentedCars.length}</div>
              <div className="text-blue-300 text-sm">Currently Rented</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 border-orange-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <AlertCircle className="w-8 h-8 text-orange-400" />
                <Badge className="bg-orange-500/30 text-orange-200">Service</Badge>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{maintenanceCars.length}</div>
              <div className="text-orange-300 text-sm">In Maintenance</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Gauge className="w-8 h-8 text-purple-400" />
                <Badge className="bg-purple-500/30 text-purple-200">Live</Badge>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{utilizationRate}%</div>
              <div className="text-purple-300 text-sm">Utilization Rate</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* KPIs */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Earnings Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm">This Month</p>
                <p className="text-2xl font-bold text-white">${thisMonthEarnings.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">All Time</p>
                <p className="text-xl font-bold text-green-400">${totalEarnings.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg Per Rental</p>
                <p className="text-xl font-bold text-white">${avgDailyEarnings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Today's Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysRentals.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No rentals today</p>
            ) : (
              <div className="space-y-3">
                {todaysRentals.map(rental => (
                  <div key={rental.id} className="bg-white/5 rounded-lg p-3">
                    <p className="text-white font-semibold text-sm">{rental.car_model}</p>
                    <p className="text-gray-400 text-xs">{rental.duration_days} days</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Total Rentals</span>
                <span className="text-white font-bold">{completedRentals.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Active Now</span>
                <span className="text-blue-400 font-bold">{activeRentals.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Utilization</span>
                <span className="text-purple-400 font-bold">{utilizationRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Fleet Size</span>
                <span className="text-white font-bold">{cars.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            Upcoming Rentals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingRentals.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No upcoming rentals</p>
          ) : (
            <div className="space-y-3">
              {upcomingRentals.map(rental => (
                <div key={rental.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-bold">{rental.car_model}</h4>
                    <p className="text-gray-400 text-sm">
                      {new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-gray-400 text-xs">{rental.duration_days} days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-lg">${rental.total_amount}</p>
                    <Badge className={
                      rental.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      rental.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }>
                      {rental.status}
                    </Badge>
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
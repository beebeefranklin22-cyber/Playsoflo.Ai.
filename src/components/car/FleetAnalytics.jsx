import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, DollarSign, Calendar } from "lucide-react";

export default function FleetAnalytics({ cars, rentals }) {
  const completedRentals = rentals.filter(r => r.status === 'completed');
  const totalRevenue = completedRentals.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const avgRentalValue = completedRentals.length > 0 
    ? totalRevenue / completedRentals.length 
    : 0;

  const utilizationRate = cars.length > 0 
    ? ((rentals.filter(r => ['active', 'confirmed'].includes(r.status)).length / cars.length) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Revenue</p>
                <p className="text-white text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg Rental Value</p>
                <p className="text-white text-2xl font-bold">${avgRentalValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Utilization Rate</p>
                <p className="text-white text-2xl font-bold">{utilizationRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Revenue by Vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cars.map(car => {
              const carRentals = rentals.filter(r => r.car_model === car.title);
              const revenue = carRentals
                .filter(r => r.status === 'completed')
                .reduce((sum, r) => sum + (r.total_amount || 0), 0);
              const maxRevenue = Math.max(...cars.map(c => 
                rentals
                  .filter(r => r.car_model === c.title && r.status === 'completed')
                  .reduce((sum, r) => sum + (r.total_amount || 0), 0)
              ));

              return (
                <div key={car.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm">{car.title}</span>
                    <span className="text-green-400 font-bold">${revenue.toFixed(0)}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
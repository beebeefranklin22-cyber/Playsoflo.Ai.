import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, X } from "lucide-react";

export default function AvailabilityCalendar({ car, rentals, onClose }) {
  const carRentals = rentals.filter(r => r.car_model === car.title);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-400" />
            {car.title} - Rental Calendar
          </CardTitle>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="bg-white/5 border-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {carRentals.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No bookings for this vehicle yet</p>
            </div>
          ) : (
            carRentals.map(rental => (
              <div key={rental.id} className="p-4 bg-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold">
                      {new Date(rental.start_date).toLocaleDateString()} - {new Date(rental.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-gray-400 text-sm">Renter: {rental.renter_email}</p>
                  </div>
                  <Badge className={
                    rental.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    rental.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }>
                    {rental.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-400">
                  Revenue: <span className="text-green-400 font-bold">${rental.total_amount}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
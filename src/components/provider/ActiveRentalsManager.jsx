import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Car, Home, DollarSign, Clock, AlertTriangle } from "lucide-react";
import AdditionalFeesManager from "./AdditionalFeesManager";
import { motion, AnimatePresence } from "framer-motion";

export default function ActiveRentalsManager({ currentUser }) {
  const [selectedRental, setSelectedRental] = useState(null);
  const [showFeeModal, setShowFeeModal] = useState(false);

  const { data: carRentals = [] } = useQuery({
    queryKey: ['provider-active-car-rentals', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.CarRental.filter({
        provider_email: currentUser.email,
        status: { $in: ['active', 'confirmed'] }
      });
    },
    enabled: !!currentUser,
    refetchInterval: 30000
  });

  const { data: propertyBookings = [] } = useQuery({
    queryKey: ['provider-active-property-bookings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.Booking.filter({
        host_email: currentUser.email,
        status: 'confirmed'
      });
    },
    enabled: !!currentUser,
    refetchInterval: 30000
  });

  const allActiveRentals = [
    ...carRentals.map(r => ({ ...r, rentalType: 'car_rental' })),
    ...propertyBookings.map(b => ({ ...b, rentalType: 'property_booking' }))
  ];

  if (allActiveRentals.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-12 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-400">No active rentals at the moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Active Rentals ({allActiveRentals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allActiveRentals.map((rental) => {
            const endDate = new Date(rental.end_date || rental.check_out);
            const isOverdue = endDate < new Date();
            const hoursUntilEnd = Math.round((endDate - new Date()) / (1000 * 60 * 60));
            
            return (
              <div key={rental.id} className="bg-white/10 backdrop-blur-xl rounded-lg p-4 border border-white/20">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    {rental.rentalType === 'car_rental' ? (
                      <Car className="w-5 h-5 text-blue-400 mt-1" />
                    ) : (
                      <Home className="w-5 h-5 text-purple-400 mt-1" />
                    )}
                    <div className="flex-1">
                      <h4 className="text-white font-semibold">
                        {rental.rentalType === 'car_rental'
                          ? `${rental.car_make} ${rental.car_model}`
                          : rental.property_title || 'Property Booking'}
                      </h4>
                      <p className="text-gray-400 text-sm">{rental.renter_email || rental.guest_email}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="text-gray-300">
                          Ends: {endDate.toLocaleDateString()} {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!isOverdue && (
                          <span className={`${
                            hoursUntilEnd < 24 ? 'text-orange-400' : 'text-blue-400'
                          }`}>
                            {hoursUntilEnd}h left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-lg mb-1">
                      ${(rental.total_amount || rental.total_price || 0).toFixed(0)}
                    </div>
                    <Badge className={
                      isOverdue
                        ? 'bg-red-500/30 text-red-300'
                        : hoursUntilEnd < 24
                        ? 'bg-orange-500/30 text-orange-300'
                        : 'bg-green-500/30 text-green-300'
                    }>
                      {isOverdue ? 'OVERDUE' : rental.status}
                    </Badge>
                  </div>
                </div>

                {isOverdue && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-300 text-xs">Rental is overdue. Contact customer or charge late fee.</span>
                  </div>
                )}

                <Button
                  onClick={() => {
                    setSelectedRental(rental);
                    setShowFeeModal(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="w-full bg-white/5 hover:bg-white/10"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Charge Additional Fee
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showFeeModal && selectedRental && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowFeeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-2xl w-full"
            >
              <AdditionalFeesManager
                rental={selectedRental}
                rentalType={selectedRental.rentalType}
                onClose={() => {
                  setShowFeeModal(false);
                  setSelectedRental(null);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
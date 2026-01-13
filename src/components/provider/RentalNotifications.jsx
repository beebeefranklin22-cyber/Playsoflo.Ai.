import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Car, Home, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function RentalNotifications({ currentUser }) {
  const qc = useQueryClient();

  const { data: carRentals = [] } = useQuery({
    queryKey: ['provider-car-rentals-ending', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const rentals = await base44.entities.CarRental.filter({
        provider_email: currentUser.email,
        status: { $in: ['active', 'confirmed'] }
      });
      
      // Filter rentals ending in next 24-48 hours
      const now = new Date();
      const next48Hours = new Date(now.getTime() + (48 * 60 * 60 * 1000));
      
      return rentals.filter(r => {
        const endDate = new Date(r.end_date);
        return endDate >= now && endDate <= next48Hours;
      });
    },
    enabled: !!currentUser,
    refetchInterval: 300000 // Check every 5 minutes
  });

  const { data: propertyBookings = [] } = useQuery({
    queryKey: ['provider-property-ending', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const bookings = await base44.entities.Booking.filter({
        host_email: currentUser.email,
        status: 'confirmed'
      });
      
      const now = new Date();
      const next48Hours = new Date(now.getTime() + (48 * 60 * 60 * 1000));
      
      return bookings.filter(b => {
        const checkoutDate = new Date(b.check_out);
        return checkoutDate >= now && checkoutDate <= next48Hours;
      });
    },
    enabled: !!currentUser,
    refetchInterval: 300000
  });

  // Send notifications for upcoming rentals
  useEffect(() => {
    const sendNotifications = async () => {
      if (!currentUser) return;

      for (const rental of carRentals) {
        const notificationKey = `rental_ending_${rental.id}`;
        const alreadySent = localStorage.getItem(notificationKey);
        
        if (!alreadySent) {
          await base44.entities.Notification.create({
            recipient_email: currentUser.email,
            type: 'rental_ending_soon',
            title: 'Car Rental Ending Soon',
            message: `${rental.car_make} ${rental.car_model} rental ends on ${new Date(rental.end_date).toLocaleString()}`,
            reference_type: 'car_rental',
            reference_id: rental.id
          });
          
          localStorage.setItem(notificationKey, 'true');
        }
      }

      for (const booking of propertyBookings) {
        const notificationKey = `booking_ending_${booking.id}`;
        const alreadySent = localStorage.getItem(notificationKey);
        
        if (!alreadySent) {
          await base44.entities.Notification.create({
            recipient_email: currentUser.email,
            type: 'booking_ending_soon',
            title: 'Property Booking Ending Soon',
            message: `Guest checkout on ${new Date(booking.check_out).toLocaleString()}`,
            reference_type: 'property_booking',
            reference_id: booking.id
          });
          
          localStorage.setItem(notificationKey, 'true');
        }
      }
    };

    if (carRentals.length > 0 || propertyBookings.length > 0) {
      sendNotifications();
    }
  }, [carRentals, propertyBookings, currentUser]);

  const allRentals = [
    ...carRentals.map(r => ({ ...r, type: 'car' })),
    ...propertyBookings.map(b => ({ ...b, type: 'property' }))
  ];

  if (allRentals.length === 0) return null;

  return (
    <Card className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-orange-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Bell className="w-5 h-5 animate-pulse" />
          Rentals Ending Soon ({allRentals.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {allRentals.map((rental) => {
          const endDate = new Date(rental.end_date || rental.check_out);
          const hoursLeft = Math.round((endDate - new Date()) / (1000 * 60 * 60));
          
          return (
            <div key={rental.id} className="bg-white/10 backdrop-blur-xl rounded-lg p-4 border border-white/20">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3">
                  {rental.type === 'car' ? (
                    <Car className="w-5 h-5 text-orange-400 mt-1" />
                  ) : (
                    <Home className="w-5 h-5 text-orange-400 mt-1" />
                  )}
                  <div>
                    <h4 className="text-white font-semibold">
                      {rental.type === 'car'
                        ? `${rental.car_make} ${rental.car_model}`
                        : rental.property_title || 'Property Booking'}
                    </h4>
                    <p className="text-gray-400 text-sm">{rental.renter_email || rental.guest_email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-orange-400" />
                      <span className="text-orange-300 text-xs">Ends in {hoursLeft} hours</span>
                    </div>
                  </div>
                </div>
                <Badge className={`${
                  hoursLeft < 24 ? 'bg-red-500/30 text-red-300' : 'bg-orange-500/30 text-orange-300'
                }`}>
                  {hoursLeft < 24 ? 'Critical' : 'Soon'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Prepare for inspection and damage assessment</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
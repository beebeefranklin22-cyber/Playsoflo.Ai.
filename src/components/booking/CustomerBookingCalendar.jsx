import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

export default function CustomerBookingCalendar({ provider, service, onBookingSelect }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);

  const { data: availability = [] } = useQuery({
    queryKey: ['provider-availability', provider?.email],
    queryFn: async () => {
      if (!provider) return [];
      return await base44.entities.ProviderAvailability.filter({
        provider_email: provider.email
      });
    },
    enabled: !!provider
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['availability-overrides', provider?.email],
    queryFn: async () => {
      if (!provider) return [];
      return await base44.entities.ServiceAvailabilityOverride.filter({
        provider_email: provider.email
      });
    },
    enabled: !!provider
  });

  const { data: existingBookings = [] } = useQuery({
    queryKey: ['provider-bookings', provider?.email],
    queryFn: async () => {
      if (!provider) return [];
      const bookings = await base44.entities.ServiceBooking.filter({
        provider_email: provider.email,
        status: ['confirmed', 'pending']
      });
      const carRentals = await base44.entities.CarRental.filter({
        provider_email: provider.email,
        status: ['confirmed', 'active']
      });
      const propertyBookings = await base44.entities.Booking.filter({
        host_email: provider.email,
        status: ['confirmed']
      });
      return [...bookings, ...carRentals, ...propertyBookings];
    },
    enabled: !!provider
  });

  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !availability.length) return [];

    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const dateString = selectedDate.toISOString().split('T')[0];

    // Check for overrides on this date
    const override = overrides.find(o => o.override_date === dateString);
    if (override && !override.is_available) {
      return []; // Day is blocked
    }

    // Get base availability for this day
    const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);
    if (!dayAvailability || !dayAvailability.is_available) {
      return [];
    }

    // Generate time slots
    const slots = [];
    const startTime = dayAvailability.start_time || '09:00';
    const endTime = dayAvailability.end_time || '17:00';
    const duration = service?.duration || 60; // minutes

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    let currentTime = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;

    while (currentTime + duration <= endTimeMinutes) {
      const hours = Math.floor(currentTime / 60);
      const minutes = currentTime % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Check if slot is already booked
      const isBooked = existingBookings.some(booking => {
        const bookingDate = new Date(booking.booking_date || booking.start_date);
        const bookingTime = booking.booking_time || booking.start_time;
        return bookingDate.toISOString().split('T')[0] === dateString && bookingTime === timeString;
      });

      if (!isBooked) {
        slots.push({
          time: timeString,
          display: new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })
        });
      }

      currentTime += duration;
    }

    return slots;
  }, [selectedDate, availability, overrides, existingBookings, service]);

  const handleSelectTime = (slot) => {
    setSelectedTime(slot);
    if (onBookingSelect) {
      onBookingSelect({
        date: selectedDate,
        time: slot.time,
        displayTime: slot.display
      });
    }
    toast.success(`Selected ${slot.display} on ${selectedDate.toLocaleDateString()}`);
  };

  const isDateAvailable = (date) => {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const dateString = date.toISOString().split('T')[0];

    // Check overrides
    const override = overrides.find(o => o.override_date === dateString);
    if (override) return override.is_available;

    // Check regular availability
    const dayAvail = availability.find(a => a.day_of_week === dayOfWeek);
    return dayAvail?.is_available || false;
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Select Date & Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || !isDateAvailable(date)}
                className="rounded-md border border-white/20 bg-white/5"
                classNames={{
                  months: "text-white",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center text-white",
                  caption_label: "text-sm font-medium text-white",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-purple-500/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-9 w-9 p-0 font-normal text-white hover:bg-white/10 rounded-md",
                  day_selected: "bg-purple-600 text-white hover:bg-purple-700",
                  day_today: "bg-white/10 text-purple-400",
                  day_outside: "text-gray-600 opacity-50",
                  day_disabled: "text-gray-600 opacity-30",
                  day_hidden: "invisible",
                }}
              />
            </div>

            {/* Time Slots */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Available Times - {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              
              {availableTimeSlots.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-gray-400">No available time slots for this date</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-2">
                  {availableTimeSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      onClick={() => handleSelectTime(slot)}
                      variant={selectedTime?.time === slot.time ? "default" : "outline"}
                      className={selectedTime?.time === slot.time 
                        ? "bg-purple-600 hover:bg-purple-700 text-white" 
                        : "bg-white/5 border-white/20 text-white hover:bg-white/10"
                      }
                    >
                      {slot.display}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedTime && (
            <div className="mt-4 p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg">
              <p className="text-white font-semibold">
                Selected: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedTime.display}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
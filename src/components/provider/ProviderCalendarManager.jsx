import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar as CalendarIcon, Clock, Ban, CheckCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

export default function ProviderCalendarManager({ currentUser }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [blockingMode, setBlockingMode] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const queryClient = useQueryClient();

  const { data: bookings = [] } = useQuery({
    queryKey: ['provider-calendar-bookings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const serviceBookings = await base44.entities.ServiceBooking.filter({
        provider_email: currentUser.email
      });
      const carRentals = await base44.entities.CarRental.filter({
        provider_email: currentUser.email
      });
      const propertyBookings = await base44.entities.Booking.filter({
        host_email: currentUser.email
      });
      return [...serviceBookings, ...carRentals, ...propertyBookings];
    },
    enabled: !!currentUser
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['provider-overrides', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.ServiceAvailabilityOverride.filter({
        provider_email: currentUser.email
      });
    },
    enabled: !!currentUser
  });

  const blockDateMutation = useMutation({
    mutationFn: async ({ date, reason }) => {
      return await base44.entities.ServiceAvailabilityOverride.create({
        provider_email: currentUser.email,
        override_date: date,
        is_available: false,
        reason: reason || 'Provider blocked this date',
        start_time: '00:00',
        end_time: '23:59'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-overrides']);
      toast.success('Date blocked successfully');
      setBlockingMode(false);
      setBlockReason('');
      setSelectedDate(null);
    }
  });

  const unblockDateMutation = useMutation({
    mutationFn: async (overrideId) => {
      return await base44.entities.ServiceAvailabilityOverride.delete(overrideId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-overrides']);
      toast.success('Date unblocked successfully');
    }
  });

  const bookingsByDate = useMemo(() => {
    const map = {};
    bookings.forEach(booking => {
      const date = new Date(booking.booking_date || booking.start_date || booking.created_date);
      const dateKey = date.toISOString().split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(booking);
    });
    return map;
  }, [bookings]);

  const blockedDates = useMemo(() => {
    return overrides
      .filter(o => !o.is_available)
      .map(o => o.override_date);
  }, [overrides]);

  const getDayContent = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    const dayBookings = bookingsByDate[dateKey] || [];
    const isBlocked = blockedDates.includes(dateKey);

    if (isBlocked) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <Ban className="w-4 h-4 text-red-500" />
        </div>
      );
    }

    if (dayBookings.length > 0) {
      return (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
          {dayBookings.length}
        </div>
      );
    }

    return null;
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const handleBlockDate = () => {
    if (!selectedDate) return;
    blockDateMutation.mutate({
      date: selectedDate.toISOString().split('T')[0],
      reason: blockReason
    });
  };

  const handleUnblockDate = (overrideId) => {
    unblockDateMutation.mutate(overrideId);
  };

  const selectedDateKey = selectedDate?.toISOString().split('T')[0];
  const selectedDayBookings = selectedDateKey ? (bookingsByDate[selectedDateKey] || []) : [];
  const selectedDayOverride = overrides.find(o => o.override_date === selectedDateKey);

  const monthBookings = useMemo(() => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    return bookings.filter(b => {
      const bookingDate = new Date(b.booking_date || b.start_date || b.created_date);
      return bookingDate >= startOfMonth && bookingDate <= endOfMonth;
    });
  }, [bookings, currentMonth]);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Provider Calendar Management
          </div>
          <div className="text-sm font-normal text-gray-400">
            {monthBookings.length} bookings this month
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="bg-white/5 border-white/20 text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-white font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="bg-white/5 border-white/20 text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border border-white/20 bg-white/5"
              components={{
                Day: ({ date, ...props }) => (
                  <div className="relative">
                    <button {...props} className="relative w-full h-full">
                      {date.getDate()}
                      {getDayContent(date)}
                    </button>
                  </div>
                )
              }}
              classNames={{
                months: "text-white",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center text-white",
                caption_label: "text-sm font-medium text-white",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-gray-400 rounded-md w-10 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "text-center text-sm p-0 relative h-10 w-10",
                day: "h-10 w-10 p-0 font-normal text-white hover:bg-white/10 rounded-md relative",
                day_selected: "bg-purple-600 text-white hover:bg-purple-700",
                day_today: "bg-white/10 text-purple-400",
              }}
            />

            <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">1</div>
                <span>Has Bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-500" />
                <span>Blocked</span>
              </div>
            </div>
          </div>

          {/* Details Panel */}
          <div className="space-y-4">
            {selectedDate ? (
              <>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h4>
                  
                  {selectedDayOverride && !selectedDayOverride.is_available ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-400">
                        <Ban className="w-4 h-4" />
                        <span className="font-medium">Date Blocked</span>
                      </div>
                      <p className="text-gray-400 text-sm">{selectedDayOverride.reason}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnblockDate(selectedDayOverride.id)}
                        className="w-full bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Unblock Date
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBlockingMode(true)}
                      className="w-full bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Block This Date
                    </Button>
                  )}
                </div>

                {blockingMode && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-white font-semibold">Block Date</h5>
                      <button onClick={() => setBlockingMode(false)}>
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <Textarea
                      placeholder="Reason for blocking (optional)"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Button
                      onClick={handleBlockDate}
                      disabled={blockDateMutation.isPending}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      Confirm Block
                    </Button>
                  </div>
                )}

                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Bookings ({selectedDayBookings.length})
                  </h5>
                  {selectedDayBookings.length === 0 ? (
                    <p className="text-gray-400 text-sm">No bookings for this date</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayBookings.map((booking) => (
                        <div key={booking.id} className="bg-white/5 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium">
                              {booking.booking_time || booking.start_time || 'All day'}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                              booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm">
                            {booking.customer_email || booking.renter_email || booking.guest_email}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Select a date to view details and manage availability</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
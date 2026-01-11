import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function BookingCalendarSync({ booking, propertyTitle }) {
  const [synced, setSynced] = React.useState(false);

  const syncBooking = async () => {
    try {
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);

      const { data } = await base44.functions.invoke('syncToGoogleCalendar', {
        event_type: 'booking',
        title: `Stay at ${propertyTitle}`,
        description: `Property booking confirmation\nCheck-in: ${checkIn.toLocaleDateString()}\nCheck-out: ${checkOut.toLocaleDateString()}`,
        start_time: checkIn.toISOString(),
        end_time: checkOut.toISOString(),
        location: booking.property_address || propertyTitle
      });

      setSynced(true);
      toast.success('Added to Google Calendar!');
    } catch (error) {
      toast.error('Calendar sync unavailable');
    }
  };

  if (synced) {
    return (
      <Card className="bg-green-500/10 border-green-500/30">
        <CardContent className="p-3 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-green-400 font-medium text-sm">Synced to Calendar</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button
      onClick={syncBooking}
      variant="outline"
      size="sm"
      className="bg-white/5 border-white/20"
    >
      <Calendar className="w-4 h-4 mr-2" />
      Add to Calendar
    </Button>
  );
}
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Clock, MapPin, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ScheduleRideModal({ open, onClose, onSchedule }) {
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [scheduledDate, setScheduledDate] = useState(null);
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    if (!pickupAddress || !dropoffAddress || !scheduledDate || !scheduledTime) {
      toast.error("Please fill in all fields");
      return;
    }

    // Combine date and time
    const [hours, minutes] = scheduledTime.split(":");
    const scheduledDateTime = new Date(scheduledDate);
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Check if scheduled time is in the future
    if (scheduledDateTime <= new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    setLoading(true);
    try {
      await onSchedule({
        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,
        scheduled_time: scheduledDateTime.toISOString(),
        is_scheduled: true
      });
      
      toast.success("Ride scheduled successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to schedule ride");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Schedule a Ride</DialogTitle>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-400 text-sm">
            Book your ride in advance
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Pickup Address */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Pickup Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
              <Input
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Enter pickup address"
                className="pl-10 bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Dropoff Address */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Dropoff Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
              <Input
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                placeholder="Enter dropoff address"
                className="pl-10 bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Select Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-gray-800 border-white/20">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Picker */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Select Time
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-300 text-sm">
              💡 Schedule rides up to 7 days in advance. You'll be matched with a driver 15 minutes before your scheduled time.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 bg-white/5 border-white/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {loading ? "Scheduling..." : "Schedule Ride"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
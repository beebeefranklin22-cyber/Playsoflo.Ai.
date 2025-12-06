import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CancellationModal({ open, onClose, ride, userType }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const passengerReasons = [
    "Found alternative transportation",
    "Plans changed",
    "Driver taking too long",
    "Wrong pickup location",
    "Price too high",
    "Other"
  ];

  const driverReasons = [
    "Vehicle issue",
    "Emergency",
    "Unsafe pickup location",
    "Passenger unreachable",
    "Too far from pickup",
    "Other"
  ];

  const reasons = userType === "passenger" ? passengerReasons : driverReasons;

  const handleCancel = async () => {
    if (!reason) {
      alert("Please select a reason for cancellation");
      return;
    }

    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      
      // Update ride status
      await base44.entities.RideRequest.update(ride.id, {
        status: userType === "passenger" ? "declined_by_customer" : "cancelled",
        cancellation_reason: reason,
        cancellation_details: details,
        cancelled_by: currentUser.email
      });

      // Track driver cancellation rate
      if (userType === "driver") {
        const today = new Date().toISOString().split('T')[0];
        const stats = await base44.entities.DriverStats.filter({
          driver_email: currentUser.email,
          period_type: "daily",
          period_date: today
        });

        if (stats.length > 0) {
          const currentStats = stats[0];
          await base44.entities.DriverStats.update(currentStats.id, {
            cancellations: (currentStats.cancellations || 0) + 1,
            cancellation_rate: ((currentStats.cancellations + 1) / Math.max(currentStats.total_rides + 1, 1)) * 100
          });
        }
      }

      // Notify the other party
      const recipientEmail = userType === "passenger" ? ride.driver_email : ride.created_by;
      if (recipientEmail) {
        await base44.entities.Notification.create({
          recipient_email: recipientEmail,
          type: "ride_cancelled",
          title: "Ride Cancelled",
          message: `The ${userType} has cancelled the ride. Reason: ${reason}`,
          reference_type: "ride",
          reference_id: ride.id
        });
      }

      alert("Ride cancelled successfully");
      onClose(true);
    } catch (err) {
      console.error("Cancellation failed:", err);
      alert("Failed to cancel ride");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            Cancel Ride
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-300 text-sm">
              {userType === "driver" 
                ? "⚠️ Excessive cancellations may affect your account standing and earnings."
                : "⚠️ Cancelling after a driver has been assigned may incur a small fee."
              }
            </p>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">
              Reason for Cancellation *
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">
              Additional Details (Optional)
            </label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide more context..."
              rows={3}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-gray-400 text-xs">
              <strong>Ride Details:</strong>
              <br />
              From: {ride.pickup_address?.substring(0, 40)}...
              <br />
              To: {ride.dropoff_address?.substring(0, 40)}...
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => onClose(false)}
              variant="outline"
              className="flex-1 bg-white/5"
              disabled={loading}
            >
              Keep Ride
            </Button>
            <Button
              onClick={handleCancel}
              disabled={loading || !reason}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              {loading ? "Cancelling..." : "Cancel Ride"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
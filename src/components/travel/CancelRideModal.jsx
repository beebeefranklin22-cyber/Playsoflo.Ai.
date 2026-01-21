import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, DollarSign, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CancelRideModal({ open, onClose, ride, currentUser }) {
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Calculate cancellation fee based on ride status
  const getCancellationFee = () => {
    if (!ride) return 0;
    
    switch (ride.status) {
      case "requested":
        return 0; // Free cancellation if no driver assigned
      case "accepted":
      case "en_route":
        return 5.00; // $5 cancellation fee if driver is on the way
      case "arrived":
        return ride.fare_breakdown?.total_fare * 0.5 || 10.00; // 50% of fare if driver arrived
      default:
        return 0;
    }
  };

  const cancellationFee = getCancellationFee();

  const handleCancel = async () => {
    if (!currentUser || !ride) return;

    // Validate sufficient balance for cancellation fee
    if (cancellationFee > 0 && currentUser.balance_usd < cancellationFee) {
      toast.error("Insufficient balance to pay cancellation fee");
      return;
    }

    setCancelling(true);
    try {
      // Use secure backend function for cancellation
      const response = await base44.functions.invoke('cancelRideSecure', {
        ride_id: ride.id,
        user_email: currentUser.email,
        cancellation_reason: reason,
        cancellation_fee: cancellationFee
      });

      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success(`Ride cancelled. ${cancellationFee > 0 ? `$${cancellationFee.toFixed(2)} fee charged.` : ''}`);
      onClose();
      
      // Refresh page to update ride status
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error("Cancellation failed: " + error.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            Cancel Ride?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <p className="text-yellow-300 text-sm mb-2">
              <strong>Cancellation Fee:</strong>
            </p>
            <div className="text-3xl font-bold text-yellow-400 flex items-center gap-2">
              <DollarSign className="w-8 h-8" />
              {cancellationFee.toFixed(2)}
            </div>
            {cancellationFee === 0 ? (
              <p className="text-gray-400 text-xs mt-2">No fee - driver not yet assigned</p>
            ) : ride.status === "arrived" ? (
              <p className="text-gray-400 text-xs mt-2">50% of fare - driver has arrived</p>
            ) : (
              <p className="text-gray-400 text-xs mt-2">Standard cancellation fee</p>
            )}
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">Ride Details:</p>
            <p className="text-white font-semibold">{ride?.pickup_address}</p>
            <p className="text-gray-400 text-sm">to</p>
            <p className="text-white font-semibold">{ride?.dropoff_address}</p>
          </div>

          {currentUser?.balance_usd !== undefined && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Your Balance:</span>
                <span className="text-white font-bold">${currentUser.balance_usd.toFixed(2)}</span>
              </div>
              {cancellationFee > 0 && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-400 text-sm">After Cancellation:</span>
                  <span className="text-white font-bold">${(currentUser.balance_usd - cancellationFee).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Cancellation Reason (Optional)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Let us know why you're cancelling..."
              className="bg-white/10 border-white/20 text-white"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-white/5 border-white/20"
              disabled={cancelling}
            >
              Keep Ride
            </Button>
            <Button
              onClick={handleCancel}
              disabled={cancelling || (cancellationFee > 0 && currentUser?.balance_usd < cancellationFee)}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {cancelling ? "Cancelling..." : "Cancel Ride"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
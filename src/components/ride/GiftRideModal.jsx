import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, MapPin, User, Phone, Mail, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function GiftRideModal({ open, onClose }) {
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [giftCode, setGiftCode] = useState(null);

  const generateGiftCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleGiftRide = async () => {
    if (!pickupAddress || !dropoffAddress || !recipientName || (!recipientEmail && !recipientPhone)) {
      toast.error("Please fill in all required fields");
      return;
    }

    // This used to insert a RideRequest directly from the browser with a
    // hardcoded $15 fare_breakdown and no payment collected from the
    // gifter at all -- so "gifting" a ride cost the gifter nothing, and
    // since no money ever moved, no driver would actually get paid to
    // drive it either. Properly charging the gifter needs a real fare
    // (vehicle class + distance, like the normal ride-request flow
    // computes) and an actual charge via requestRideSecure, which this
    // modal doesn't collect -- that's a real feature to build, not a
    // one-line fix, so this is disabled rather than shipped as a fake
    // "free ride" generator.
    toast.error("Gift rides aren't available yet -- check back soon!");
  };

  const copyGiftCode = () => {
    navigator.clipboard.writeText(giftCode);
    toast.success("Gift code copied!");
  };

  if (giftCode) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl">Gift Ride Created!</DialogTitle>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="text-center py-6">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Gift className="w-10 h-10 text-white" />
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">
              Gift Code
            </h3>
            
            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <div className="text-4xl font-bold text-white tracking-wider mb-2">
                {giftCode}
              </div>
              <Button
                onClick={copyGiftCode}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/20"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              Share this code with {recipientName} to redeem their free ride!
            </p>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-left">
              <div className="text-green-300 text-sm">
                <strong>Ride Details:</strong><br />
                From: {pickupAddress}<br />
                To: {dropoffAddress}<br />
                Recipient: {recipientName}
              </div>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Gift className="w-6 h-6 text-pink-400" />
              Gift a Ride
            </DialogTitle>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-400 text-sm">
            Send someone a free ride
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Recipient Name */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Recipient Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Who's receiving this gift?"
                className="pl-10 bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Recipient Email */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Recipient Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Optional - for notification"
                className="pl-10 bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Recipient Phone */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Recipient Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
              <Input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="Optional - for SMS notification"
                className="pl-10 bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Pickup Address */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Pickup Location *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
              <Input
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Where should they be picked up?"
                className="pl-10 bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Dropoff Address */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Dropoff Location *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
              <Input
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                placeholder="Where should they go?"
                className="pl-10 bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Info */}
          <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3">
            <p className="text-pink-300 text-sm">
              💝 The recipient will receive a unique code to redeem this ride. They'll show the code to the driver for verification.
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
            onClick={handleGiftRide}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600"
          >
            <Gift className="w-4 h-4 mr-2" />
            {loading ? "Creating..." : "Gift Ride"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
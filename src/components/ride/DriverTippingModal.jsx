import React, { useState } from "react";
import { X, DollarSign, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DriverTippingModal({ ride, driver, onClose }) {
  const [customTip, setCustomTip] = useState("");
  const [selectedTip, setSelectedTip] = useState(null);
  const [processing, setProcessing] = useState(false);

  const quickTips = [
    { label: "$2", value: 2 },
    { label: "$5", value: 5 },
    { label: "$10", value: 10 },
    { label: "$15", value: 15 }
  ];

  const handleTip = async () => {
    const tipAmount = selectedTip || parseFloat(customTip);
    
    if (!tipAmount || tipAmount <= 0) {
      toast.error('Please select or enter a tip amount');
      return;
    }

    if (tipAmount > 100) {
      toast.error('Maximum tip amount is $100');
      return;
    }

    setProcessing(true);
    try {
      const currentUser = await base44.auth.me();

      // Check balance
      if (currentUser.balance < tipAmount) {
        toast.error('Insufficient balance. Please add funds to your wallet.');
        setProcessing(false);
        return;
      }

      // Create tip transaction
      await base44.entities.TipTransaction.create({
        creator_email: ride.driver_email,
        creator_username: driver?.username || driver?.full_name,
        tipper_email: currentUser.email,
        tipper_name: currentUser.full_name,
        tipper_username: currentUser.username,
        amount_usd: tipAmount,
        amount_rri: 0,
        message: `Ride tip from ${currentUser.full_name}`,
        content_id: ride.id,
        is_livestream_tip: false
      });

      // Update balances
      await base44.auth.updateMe({
        balance: currentUser.balance - tipAmount
      });

      const driverData = await base44.entities.User.filter({ email: ride.driver_email });
      if (driverData[0]) {
        await base44.asServiceRole.entities.User.update(driverData[0].id, {
          balance: (driverData[0].balance || 0) + tipAmount
        });
      }

      // Notify driver
      await base44.entities.Notification.create({
        recipient_email: ride.driver_email,
        type: 'tip_received',
        title: `💰 You received a $${tipAmount.toFixed(2)} tip!`,
        message: `${currentUser.full_name} tipped you for the ride`,
        reference_type: 'ride',
        reference_id: ride.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        sender_photo: currentUser.profile_picture
      });

      toast.success(`✅ $${tipAmount.toFixed(2)} tip sent to ${driver?.full_name || 'driver'}!`);
      onClose();
    } catch (error) {
      console.error('Tip error:', error);
      toast.error('Failed to send tip: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/90">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-gray-900 rounded-3xl p-6 border border-white/10"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Tip Your Driver</h2>
              <p className="text-gray-400 text-sm">{driver?.full_name || 'Driver'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Quick Tip Buttons */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-3">Quick tip amounts</p>
          <div className="grid grid-cols-4 gap-3">
            {quickTips.map((tip) => (
              <button
                key={tip.value}
                onClick={() => {
                  setSelectedTip(tip.value);
                  setCustomTip("");
                }}
                className={`py-4 rounded-xl font-bold text-lg transition ${
                  selectedTip === tip.value
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {tip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-3">Or enter custom amount</p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-xl">$</span>
            <input
              type="number"
              value={customTip}
              onChange={(e) => {
                setCustomTip(e.target.value);
                setSelectedTip(null);
              }}
              placeholder="0.00"
              min="0"
              max="100"
              step="0.01"
              className="w-full pl-10 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-xl font-bold focus:outline-none focus:border-yellow-500"
            />
          </div>
          <p className="text-gray-500 text-xs mt-2">Maximum tip: $100</p>
        </div>

        {/* Appreciation Message */}
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-yellow-400" />
            <p className="text-yellow-300 font-semibold">Show your appreciation</p>
          </div>
          <p className="text-yellow-200 text-sm">
            100% of your tip goes directly to your driver
          </p>
        </div>

        {/* Submit Button */}
        <div className="space-y-3">
          <Button
            onClick={handleTip}
            disabled={processing || (!selectedTip && !customTip)}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 py-6 text-lg font-bold"
          >
            {processing ? 'Processing...' : `Send Tip ${selectedTip || customTip ? `($${(selectedTip || parseFloat(customTip) || 0).toFixed(2)})` : ''}`}
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-gray-400"
          >
            Skip
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Package, MapPin, DollarSign, Loader2, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function CreateDeliveryModal({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [formData, setFormData] = useState({
    sender_name: currentUser?.full_name || '',
    sender_phone: '',
    sender_email: currentUser?.email || '',
    pickup_address: '',
    pickup_coords: null,
    recipient_name: '',
    recipient_phone: '',
    recipient_email: '',
    delivery_address: '',
    delivery_coords: null,
    package_type: 'small_box',
    package_weight: 0,
    package_description: '',
    package_value: 0,
    delivery_type: 'standard',
    urgency_level: 'normal',
    special_instructions: '',
    signature_required: false
  });

  const geocodeAddress = async (address) => {
    // In production, use Google Maps Geocoding API
    // For now, return mock coordinates
    return [25.7617 + Math.random() * 0.1, -80.1918 + Math.random() * 0.1];
  };

  const calculatePrice = async () => {
    setLoading(true);
    try {
      const pickupCoords = await geocodeAddress(formData.pickup_address);
      const deliveryCoords = await geocodeAddress(formData.delivery_address);

      const { data } = await base44.functions.invoke('calculateDeliveryPrice', {
        pickup_coords: pickupCoords,
        delivery_coords: deliveryCoords,
        package_type: formData.package_type,
        package_weight: parseFloat(formData.package_weight) || 0,
        package_value: parseFloat(formData.package_value) || 0,
        delivery_type: formData.delivery_type,
        urgency_level: formData.urgency_level
      });

      setPricing(data.pricing);
      setFormData({
        ...formData,
        pickup_coords: pickupCoords,
        delivery_coords: deliveryCoords
      });
      setStep(3);
    } catch (error) {
      toast.error('Failed to calculate price');
    } finally {
      setLoading(false);
    }
  };

  const createDelivery = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('createDeliveryOrder', {
        order_data: formData,
        pricing: pricing
      });

      queryClient.invalidateQueries({ queryKey: ['my-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      
      const franchiseMsg = data.franchise ? ` Assigned to ${data.franchise}.` : '';
      const waitMsg = data.estimated_wait_minutes ? ` Est. wait: ${data.estimated_wait_minutes} min` : '';
      
      toast.success(`🚚 Delivery created! Order #${data.order_number.substring(0, 8)}.${franchiseMsg}${waitMsg}`);
      onClose();
    } catch (error) {
      const errorData = error.response?.data || {};
      if (errorData.error === 'Insufficient balance') {
        toast.error(`Insufficient balance. Need $${errorData.required}, have $${errorData.available}`);
      } else {
        toast.error(errorData.error || 'Failed to create delivery');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl border border-white/10 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 border-b border-white/10 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Package className="w-6 h-6" />
                New Delivery
              </h2>
              <p className="text-blue-100 text-sm">Step {step} of 3</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Sender & Package Info */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h3 className="text-white font-bold mb-4">Sender Information</h3>
              
              <Input
                placeholder="Your Name"
                value={formData.sender_name}
                onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
              
              <Input
                placeholder="Your Phone Number"
                value={formData.sender_phone}
                onChange={(e) => setFormData({ ...formData, sender_phone: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />

              <Textarea
                placeholder="Pickup Address *"
                value={formData.pickup_address}
                onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />

              <h3 className="text-white font-bold mt-6 mb-4">Package Details</h3>

              <select
                value={formData.package_type}
                onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
              >
                <option value="envelope">Envelope</option>
                <option value="small_box">Small Box</option>
                <option value="medium_box">Medium Box</option>
                <option value="large_box">Large Box</option>
                <option value="fragile">Fragile Item</option>
                <option value="food">Food</option>
                <option value="documents">Documents</option>
              </select>

              <Input
                type="number"
                placeholder="Package Weight (lbs)"
                value={formData.package_weight}
                onChange={(e) => setFormData({ ...formData, package_weight: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />

              <Input
                placeholder="What's inside? (e.g., Birthday Gift)"
                value={formData.package_description}
                onChange={(e) => setFormData({ ...formData, package_description: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />

              <Input
                type="number"
                placeholder="Declared Value (for insurance, optional)"
                value={formData.package_value}
                onChange={(e) => setFormData({ ...formData, package_value: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />

              <Button
                onClick={() => setStep(2)}
                disabled={!formData.sender_name || !formData.sender_phone || !formData.pickup_address}
                className="w-full bg-blue-600 hover:bg-blue-700 py-6"
              >
                Next: Recipient Info
              </Button>
            </motion.div>
          )}

          {/* Step 2: Recipient & Delivery Options */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h3 className="text-white font-bold mb-4">Recipient Information</h3>
              
              <Input
                placeholder="Recipient Name *"
                value={formData.recipient_name}
                onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />
              
              <Input
                placeholder="Recipient Phone *"
                value={formData.recipient_phone}
                onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />

              <Textarea
                placeholder="Delivery Address *"
                value={formData.delivery_address}
                onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />

              <h3 className="text-white font-bold mt-6 mb-4">Delivery Options</h3>

              <select
                value={formData.delivery_type}
                onChange={(e) => setFormData({ ...formData, delivery_type: e.target.value })}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
              >
                <option value="standard">Standard (2-4 hours)</option>
                <option value="express">Express (1-2 hours) +50%</option>
                <option value="same_day">Same Day +75%</option>
                <option value="scheduled">Scheduled (Flexible) -$2</option>
              </select>

              <select
                value={formData.urgency_level}
                onChange={(e) => setFormData({ ...formData, urgency_level: e.target.value })}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
              >
                <option value="normal">Normal Priority</option>
                <option value="urgent">Urgent (+$5)</option>
                <option value="critical">Critical (+$15)</option>
              </select>

              <Textarea
                placeholder="Special Instructions (optional)"
                value={formData.special_instructions}
                onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                className="bg-white/10 border-white/20 text-white"
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.signature_required}
                  onChange={(e) => setFormData({ ...formData, signature_required: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-white text-sm">Require signature on delivery</span>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white"
                >
                  Back
                </Button>
                <Button
                  onClick={calculatePrice}
                  disabled={loading || !formData.recipient_name || !formData.recipient_phone || !formData.delivery_address}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5 mr-2" />
                      Get Quote
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Price Confirmation */}
          {step === 3 && pricing && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Price Comparison */}
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingDown className="w-8 h-8 text-green-400" />
                  <div>
                    <h3 className="text-white font-bold text-xl">You Save {pricing.uber_comparison.savings_percentage}%!</h3>
                    <p className="text-green-300 text-sm">vs Uber delivery pricing</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-gray-400 text-sm mb-1">Uber Estimate</p>
                    <p className="text-red-400 font-bold text-2xl line-through">
                      ${pricing.uber_comparison.uber_estimate}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-gray-400 text-sm mb-1">Your Price</p>
                    <p className="text-green-400 font-bold text-2xl">
                      ${pricing.total_price}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-bold mb-4">Price Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Distance ({pricing.distance_miles} miles)</span>
                    <span>${pricing.base_price}</span>
                  </div>
                  {pricing.package_surcharge > 0 && (
                    <div className="flex justify-between text-gray-300">
                      <span>Package Type</span>
                      <span>${pricing.package_surcharge}</span>
                    </div>
                  )}
                  {pricing.weight_surcharge > 0 && (
                    <div className="flex justify-between text-gray-300">
                      <span>Weight Surcharge</span>
                      <span>${pricing.weight_surcharge}</span>
                    </div>
                  )}
                  {pricing.urgency_surcharge > 0 && (
                    <div className="flex justify-between text-gray-300">
                      <span>Urgency Fee</span>
                      <span>${pricing.urgency_surcharge}</span>
                    </div>
                  )}
                  {pricing.insurance_fee > 0 && (
                    <div className="flex justify-between text-gray-300">
                      <span>Insurance</span>
                      <span>${pricing.insurance_fee}</span>
                    </div>
                  )}
                  {pricing.surge_fee > 0 && (
                    <div className="flex justify-between text-yellow-400">
                      <span>⚡ Surge Pricing ({pricing.surge_multiplier}x)</span>
                      <span>+${pricing.surge_fee}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-300">
                    <span>Platform Fee (15%)</span>
                    <span>${pricing.platform_fee}</span>
                  </div>
                  <div className="border-t border-white/20 pt-2 mt-2">
                    <div className="flex justify-between text-white font-bold text-lg">
                      <span>Total</span>
                      <span>${pricing.total_price}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 space-y-1">
                  <p className="text-blue-300 text-sm">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Estimated delivery: {pricing.estimated_duration_minutes} minutes
                  </p>
                  <p className="text-green-300 text-sm">
                    🚗 Driver earns: <strong>${pricing.driver_earnings}</strong> for this delivery
                  </p>
                </div>
              </div>

              {/* Confirm */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white"
                >
                  Back
                </Button>
                <Button
                  onClick={createDelivery}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Confirm & Pay ${pricing.total_price}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
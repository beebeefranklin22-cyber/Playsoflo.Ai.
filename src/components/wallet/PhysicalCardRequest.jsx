import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Truck, CheckCircle, Clock, X, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function PhysicalCardRequest({ currentUser, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [cardType, setCardType] = useState("standard");
  const [shippingAddress, setShippingAddress] = useState({
    name: currentUser?.full_name || "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US"
  });

  const { data: existingRequest } = useQuery({
    queryKey: ['physical-card-request', currentUser?.email],
    queryFn: async () => {
      const requests = await base44.entities.PhysicalCardRequest.filter({ 
        user_email: currentUser.email 
      });
      return requests.length > 0 ? requests[0] : null;
    },
    enabled: !!currentUser && isOpen
  });

  const requestCardMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.PhysicalCardRequest.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['physical-card-request']);
      toast.success('Card request submitted! We\'ll review and ship within 5-7 business days.');
      onClose();
    }
  });

  const handleSubmit = () => {
    if (!shippingAddress.name || !shippingAddress.line1 || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.postal_code) {
      toast.error('Please fill in all required fields');
      return;
    }

    requestCardMutation.mutate({
      user_email: currentUser.email,
      card_type: cardType,
      shipping_address: shippingAddress,
      status: 'pending'
    });
  };

  if (!isOpen) return null;

  return (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-gray-900 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-purple-400" />
              Request Physical Card
            </h2>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {existingRequest ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    existingRequest.status === 'delivered' ? 'bg-green-500/20' :
                    existingRequest.status === 'shipped' ? 'bg-blue-500/20' :
                    existingRequest.status === 'in_production' ? 'bg-yellow-500/20' :
                    existingRequest.status === 'approved' ? 'bg-purple-500/20' :
                    'bg-gray-500/20'
                  }`}>
                    {existingRequest.status === 'delivered' ? <CheckCircle className="w-8 h-8 text-green-400" /> :
                     existingRequest.status === 'shipped' ? <Truck className="w-8 h-8 text-blue-400" /> :
                     existingRequest.status === 'in_production' ? <Package className="w-8 h-8 text-yellow-400" /> :
                     <Clock className="w-8 h-8 text-gray-400" />}
                  </div>
                  
                  <h3 className="text-white font-bold text-xl mb-2 capitalize">
                    {existingRequest.status.replace('_', ' ')}
                  </h3>
                  
                  <p className="text-gray-400 mb-4">
                    {existingRequest.status === 'pending' && 'Your card request is under review'}
                    {existingRequest.status === 'approved' && 'Your card has been approved and will be produced soon'}
                    {existingRequest.status === 'in_production' && 'Your card is being manufactured'}
                    {existingRequest.status === 'shipped' && 'Your card is on the way!'}
                    {existingRequest.status === 'delivered' && 'Your card has been delivered'}
                  </p>

                  {existingRequest.tracking_number && (
                    <div className="bg-white/5 rounded-xl p-4 mb-4">
                      <p className="text-gray-400 text-sm mb-1">Tracking Number</p>
                      <p className="text-white font-mono font-bold">{existingRequest.tracking_number}</p>
                    </div>
                  )}

                  {existingRequest.card_number_last4 && (
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-gray-400 text-sm mb-1">Card Number</p>
                      <p className="text-white font-mono font-bold">**** **** **** {existingRequest.card_number_last4}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Card Types */}
              <div>
                <label className="text-white font-semibold mb-3 block">Choose Card Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {['standard', 'premium', 'elite'].map(type => (
                    <button
                      key={type}
                      onClick={() => setCardType(type)}
                      className={`p-4 rounded-xl text-center transition ${
                        cardType === type
                          ? 'bg-purple-600 border-2 border-purple-400'
                          : 'bg-white/5 border-2 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <CreditCard className={`w-8 h-8 mx-auto mb-2 ${
                        cardType === type ? 'text-white' : 'text-gray-400'
                      }`} />
                      <p className={`font-bold capitalize ${
                        cardType === type ? 'text-white' : 'text-gray-400'
                      }`}>
                        {type}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {type === 'standard' && 'Free'}
                        {type === 'premium' && '$9.99'}
                        {type === 'elite' && '$29.99'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-3">
                <label className="text-white font-semibold block">Shipping Address</label>
                
                <Input
                  placeholder="Full Name *"
                  value={shippingAddress.name}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Input
                  placeholder="Street Address *"
                  value={shippingAddress.line1}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, line1: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />

                <Input
                  placeholder="Apt, Suite (Optional)"
                  value={shippingAddress.line2}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, line2: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="City *"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Input
                    placeholder="State *"
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <Input
                  placeholder="ZIP Code *"
                  value={shippingAddress.postal_code}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, postal_code: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-300 text-sm">
                  <strong>What you get:</strong> Physical debit card linked to your PlaySoFlo wallet. 
                  Use it anywhere Visa/Mastercard is accepted. Delivery in 5-7 business days.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={requestCardMutation.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {requestCardMutation.isPending ? 'Submitting...' : 'Request Card'}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
  );
}
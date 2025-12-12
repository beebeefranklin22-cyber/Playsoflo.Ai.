import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard, Building, DollarSign, Bitcoin, Plus,
  Check, Trash2, Star, X
} from "lucide-react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function AddCardForm({ currentUser, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    try {
      const { token, error } = await stripe.createToken(elements.getElement(CardElement));
      
      if (error) {
        toast.error(error.message);
        setProcessing(false);
        return;
      }

      const response = await base44.functions.invoke('createStripePaymentMethod', {
        type: 'card',
        token: token.id
      });

      if (response.data.success) {
        toast.success("Card added successfully!");
        onSuccess();
      } else {
        toast.error("Failed to add card");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-white/5 rounded-xl">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#fff',
                '::placeholder': { color: '#9ca3af' },
              },
            },
          }}
        />
      </div>
      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {processing ? "Adding..." : "Add Card"}
      </Button>
    </form>
  );
}

export default function PaymentMethodsManager({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [showAddExternal, setShowAddExternal] = useState(false);
  const [externalType, setExternalType] = useState(null);
  const [externalUsername, setExternalUsername] = useState("");

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods', currentUser?.email],
    queryFn: () => base44.entities.PaymentMethod.filter({
      user_email: currentUser.email,
      status: 'active'
    }),
    enabled: !!currentUser
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (methodId) => {
      // Remove default from all others
      await Promise.all(
        paymentMethods
          .filter(m => m.id !== methodId)
          .map(m => base44.entities.PaymentMethod.update(m.id, { is_default: false }))
      );
      // Set new default
      await base44.entities.PaymentMethod.update(methodId, { is_default: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payment-methods']);
      toast.success("Default payment method updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (methodId) => {
      await base44.entities.PaymentMethod.update(methodId, { status: 'disabled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payment-methods']);
      toast.success("Payment method removed");
    }
  });

  const addExternalMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.PaymentMethod.create({
        user_email: currentUser.email,
        type: externalType,
        external_details: { username: externalUsername },
        is_default: paymentMethods.length === 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payment-methods']);
      setShowAddExternal(false);
      setExternalUsername("");
      setExternalType(null);
      toast.success("Payment method added!");
    }
  });

  const getIcon = (type) => {
    switch (type) {
      case 'card': return CreditCard;
      case 'bank_account': return Building;
      case 'cashapp':
      case 'venmo':
      case 'paypal': return DollarSign;
      case 'crypto_wallet': return Bitcoin;
      default: return CreditCard;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-gray-900 rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Payment Methods</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Add Payment Method Options */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Button
            onClick={() => setShowAddCard(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Add Card
          </Button>
          <Button
            onClick={() => setShowAddBank(true)}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Building className="w-4 h-4 mr-2" />
            Add Bank
          </Button>
          <Button
            onClick={() => {
              setExternalType('cashapp');
              setShowAddExternal(true);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            CashApp
          </Button>
          <Button
            onClick={() => {
              setExternalType('venmo');
              setShowAddExternal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Venmo
          </Button>
        </div>

        {/* Add Card Form */}
        <AnimatePresence>
          {showAddCard && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <Elements stripe={stripePromise}>
                    <AddCardForm
                      currentUser={currentUser}
                      onSuccess={() => {
                        setShowAddCard(false);
                        queryClient.invalidateQueries(['payment-methods']);
                      }}
                    />
                  </Elements>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add External Account Form */}
        <AnimatePresence>
          {showAddExternal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <h3 className="text-white font-semibold mb-4 capitalize">
                    Add {externalType} Account
                  </h3>
                  <div className="space-y-4">
                    <Input
                      placeholder={`${externalType} username or email`}
                      value={externalUsername}
                      onChange={(e) => setExternalUsername(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => addExternalMutation.mutate()}
                        disabled={!externalUsername.trim() || addExternalMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {addExternalMutation.isPending ? "Adding..." : "Add Account"}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddExternal(false);
                          setExternalUsername("");
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Existing Payment Methods */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold mb-3">Your Payment Methods</h3>
          {paymentMethods.map((method) => {
            const Icon = getIcon(method.type);
            return (
              <Card key={method.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <Icon className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-semibold capitalize">
                            {method.type.replace('_', ' ')}
                          </h4>
                          {method.is_default && (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">
                          {method.card_details && `•••• ${method.card_details.last4}`}
                          {method.bank_details && `${method.bank_details.bank_name} •••• ${method.bank_details.last4}`}
                          {method.external_details && method.external_details.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.is_default && (
                        <button
                          onClick={() => setDefaultMutation.mutate(method.id)}
                          className="p-2 hover:bg-white/10 rounded-full"
                          title="Set as default"
                        >
                          <Star className="w-5 h-5 text-gray-400 hover:text-yellow-400" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(method.id)}
                        className="p-2 hover:bg-white/10 rounded-full"
                        title="Remove"
                      >
                        <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {paymentMethods.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No payment methods added yet</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
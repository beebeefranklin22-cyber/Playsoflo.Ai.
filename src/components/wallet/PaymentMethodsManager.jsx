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
  Check, Trash2, Star, X, Shield, Wallet, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

function StripePaymentForm({ clientSecret, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error("Payment form not ready");
      return;
    }

    setProcessing(true);
    toast.loading("Securing your payment method...");

    try {
      // Confirm card setup
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Save to database
      const response = await base44.functions.invoke('savePaymentMethod', {
        payment_method_id: setupIntent.payment_method
      });

      if (!response?.data?.success) {
        throw new Error("Failed to save payment method");
      }

      toast.dismiss();
      toast.success("✅ Payment method added!");
      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
      toast.dismiss();
      toast.error(error.message || "Failed to add payment method");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white/10 border border-white/20 rounded-xl p-4">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#fff',
                '::placeholder': { color: '#aab7c4' },
              },
              invalid: { color: '#fa755a' },
            },
            hidePostalCode: false
          }}
        />
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="flex-1 border-white/20 text-white"
          disabled={processing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
          disabled={!stripe || processing}
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Add Card
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function PaymentMethodsManager({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [showAddExternal, setShowAddExternal] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [externalType, setExternalType] = useState(null);
  const [externalUsername, setExternalUsername] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [loadingStripe, setLoadingStripe] = useState(false);

  const handleOpenCardForm = async () => {
    setLoadingStripe(true);
    toast.loading("Loading payment form...");
    
    try {
      const { data } = await base44.functions.invoke('createSetupIntent');
      
      if (!data?.client_secret || !data?.publishable_key) {
        throw new Error("Invalid response from server");
      }

      const stripe = await loadStripe(data.publishable_key);
      setStripePromise(stripe);
      setClientSecret(data.client_secret);
      setShowAddCard(true);
      toast.dismiss();
    } catch (error) {
      console.error('Stripe init error:', error);
      toast.dismiss();
      toast.error("Failed to load payment form");
    } finally {
      setLoadingStripe(false);
    }
  };

  const { data: paymentMethods = [], isLoading } = useQuery({
    queryKey: ['payment-methods', currentUser?.email],
    queryFn: async () => {
      const methods = await base44.entities.PaymentMethod.filter({
        user_email: currentUser.email,
        status: 'active'
      });
      return methods.sort((a, b) => {
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        return new Date(b.created_date) - new Date(a.created_date);
      });
    },
    enabled: !!currentUser
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (methodId) => {
      await Promise.all(
        paymentMethods
          .filter(m => m.id !== methodId)
          .map(m => base44.entities.PaymentMethod.update(m.id, { is_default: false }))
      );
      await base44.entities.PaymentMethod.update(methodId, { is_default: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payment-methods']);
      toast.success("Default payment method set");
    },
    onError: () => {
      toast.error("Failed to set default");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (methodId) => {
      setDeletingId(methodId);
      await base44.entities.PaymentMethod.update(methodId, { status: 'disabled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payment-methods']);
      toast.success("Payment method removed");
      setDeletingId(null);
    },
    onError: () => {
      toast.error("Failed to remove payment method");
      setDeletingId(null);
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
      case 'paypal': return Wallet;
      case 'crypto_wallet': return Bitcoin;
      default: return CreditCard;
    }
  };

  const getCardBrand = (brand) => {
    const brands = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      discover: "Discover",
      diners: "Diners Club",
      jcb: "JCB"
    };
    return brands[brand?.toLowerCase()] || brand;
  };

  const getCardColor = (brand) => {
    const colors = {
      visa: "from-blue-600 to-blue-800",
      mastercard: "from-orange-600 to-red-700",
      amex: "from-teal-600 to-cyan-700",
      discover: "from-orange-500 to-yellow-600"
    };
    return colors[brand?.toLowerCase()] || "from-gray-700 to-gray-900";
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
        className="w-full max-w-3xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">Payment Methods</h2>
                <p className="text-purple-100 text-sm">Manage your saved payment options</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Add Payment Method Options */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Payment Method
                </h3>
                
                <Button
                  onClick={handleOpenCardForm}
                  disabled={loadingStripe}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-14 text-lg font-semibold"
                >
                  {loadingStripe ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Add Card or Bank Account
                    </>
                  )}
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => {
                      setExternalType('cashapp');
                      setShowAddExternal(true);
                    }}
                    className="bg-green-600 hover:bg-green-700 h-12"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Cash App
                  </Button>
                  <Button
                    onClick={() => {
                      setExternalType('venmo');
                      setShowAddExternal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 h-12"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Venmo
                  </Button>
                  <Button
                    onClick={() => {
                      setExternalType('paypal');
                      setShowAddExternal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 h-12"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    PayPal
                  </Button>
                  <Button
                    onClick={() => {
                      setExternalType('crypto_wallet');
                      setShowAddExternal(true);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 h-12"
                  >
                    <Bitcoin className="w-4 h-4 mr-2" />
                    Crypto
                  </Button>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-400 text-xs">
                    <Shield className="w-3 h-3 inline mr-1" />
                    All payment methods are encrypted and secure. Apple Pay & Google Pay available at checkout.
                  </p>
                </div>
              </div>

              {/* Add Card Form */}
              <AnimatePresence>
                {showAddCard && stripePromise && clientSecret && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-green-400" />
                          Add Card (Secure)
                        </h3>
                        <Elements stripe={stripePromise}>
                          <StripePaymentForm
                            clientSecret={clientSecret}
                            onSuccess={() => {
                              setShowAddCard(false);
                              setClientSecret(null);
                              queryClient.invalidateQueries(['payment-methods']);
                            }}
                            onCancel={() => {
                              setShowAddCard(false);
                              setClientSecret(null);
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
                  >
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <h3 className="text-white font-semibold mb-4 capitalize">
                          Add {externalType?.replace('_', ' ')} Account
                        </h3>
                        <div className="space-y-4">
                          <Input
                            placeholder={`${externalType === 'crypto_wallet' ? 'Wallet address' : 'Username or email'}`}
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
                              {addExternalMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Add Account
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setShowAddExternal(false);
                                setExternalUsername("");
                              }}
                              variant="outline"
                              className="flex-1 border-white/20 text-white hover:bg-white/10"
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
              {paymentMethods.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Saved Payment Methods ({paymentMethods.length})
                  </h3>
                  
                  <AnimatePresence>
                    {paymentMethods.map((method) => {
                      const Icon = getIcon(method.type);
                      const isDeleting = deletingId === method.id;
                      
                      return (
                        <motion.div
                          key={method.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                        >
                          {method.type === 'card' && method.card_details ? (
                            <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${getCardColor(method.card_details.brand)} p-6 shadow-lg ${method.is_default ? 'ring-2 ring-green-500' : ''}`}>
                              <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-2">
                                  <Icon className="w-6 h-6 text-white" />
                                  {method.is_default && (
                                    <Badge className="bg-white/20 text-white border-0">
                                      <Star className="w-3 h-3 mr-1 fill-yellow-300 text-yellow-300" />
                                      Default
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {!method.is_default && (
                                    <button
                                      onClick={() => setDefaultMutation.mutate(method.id)}
                                      className="p-2 hover:bg-white/20 rounded-lg transition"
                                      title="Set as default"
                                    >
                                      <Star className="w-5 h-5 text-white" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteMutation.mutate(method.id)}
                                    disabled={isDeleting}
                                    className="p-2 hover:bg-red-500/30 rounded-lg transition disabled:opacity-50"
                                  >
                                    {isDeleting ? (
                                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                                    ) : (
                                      <Trash2 className="w-5 h-5 text-white" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <p className="text-white/90 text-2xl font-mono tracking-widest">
                                  •••• •••• •••• {method.card_details.last4}
                                </p>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-white/70 text-xs">Expires</p>
                                    <p className="text-white font-semibold">
                                      {String(method.card_details.exp_month).padStart(2, '0')}/{method.card_details.exp_year}
                                    </p>
                                  </div>
                                  <p className="text-white font-bold text-xl">
                                    {getCardBrand(method.card_details.brand)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Card className={`bg-white/5 border-white/10 ${method.is_default ? 'ring-2 ring-green-500' : ''}`}>
                              <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                                      <Icon className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-white font-semibold capitalize">
                                          {method.type.replace('_', ' ')}
                                        </h4>
                                        {method.is_default && (
                                          <Badge className="bg-green-500/20 text-green-400 text-xs border-0">
                                            <Star className="w-3 h-3 mr-1 fill-green-400" />
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
                                        className="p-2 hover:bg-white/10 rounded-full transition"
                                        title="Set as default"
                                      >
                                        <Star className="w-5 h-5 text-gray-400 hover:text-yellow-400" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteMutation.mutate(method.id)}
                                      disabled={isDeleting}
                                      className="p-2 hover:bg-white/10 rounded-full transition disabled:opacity-50"
                                      title="Remove"
                                    >
                                      {isDeleting ? (
                                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-400" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {!isLoading && paymentMethods.length === 0 && !showAddExternal && (
                <div className="text-center py-12">
                  <CreditCard className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No payment methods saved yet</p>
                  <p className="text-gray-500 text-sm">Add a payment method to get started with quick payments</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 bg-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Shield className="w-4 h-4" />
            <p>All payment information is securely encrypted and PCI-DSS compliant</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
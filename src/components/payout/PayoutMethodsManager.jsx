import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Building, Wallet, Plus, Trash2, CheckCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function PayoutMethodsManager({ currentUser, methods }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [methodType, setMethodType] = useState("stripe");
  const [formData, setFormData] = useState({});

  const addMethodMutation = useMutation({
    mutationFn: (data) => base44.entities.PayoutMethod.create({
      user_email: currentUser.email,
      method_type: methodType,
      is_primary: methods.length === 0,
      status: methodType === 'stripe' ? 'pending_verification' : 'active',
      ...data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['payout-methods']);
      toast.success('Payout method added successfully');
      setShowAddForm(false);
      setFormData({});
    }
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (methodId) => {
      // Unset all other primary flags
      const updates = methods.map(m => 
        base44.entities.PayoutMethod.update(m.id, { is_primary: m.id === methodId })
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payout-methods']);
      toast.success('Primary method updated');
    }
  });

  const deleteMethodMutation = useMutation({
    mutationFn: (id) => base44.entities.PayoutMethod.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['payout-methods']);
      toast.success('Payout method removed');
    }
  });

  const renderMethodIcon = (type) => {
    switch(type) {
      case 'stripe': return <CreditCard className="w-6 h-6 text-purple-400" />;
      case 'bank_transfer': return <Building className="w-6 h-6 text-blue-400" />;
      case 'paypal': return <Wallet className="w-6 h-6 text-blue-600" />;
      case 'crypto_wallet': return <Wallet className="w-6 h-6 text-yellow-400" />;
      default: return <CreditCard className="w-6 h-6 text-gray-400" />;
    }
  };

  const renderAddForm = () => {
    switch(methodType) {
      case 'stripe':
        return (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Connect your Stripe account to receive payouts directly.
            </p>
            <Button
              onClick={() => addMethodMutation.mutate({ stripe_account_id: 'pending_connect' })}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Connect Stripe Account
            </Button>
          </div>
        );
      
      case 'bank_transfer':
        return (
          <div className="space-y-4">
            <Input
              placeholder="Account Holder Name"
              value={formData.account_holder_name || ''}
              onChange={(e) => setFormData({...formData, account_holder_name: e.target.value})}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              placeholder="Account Number"
              value={formData.account_number || ''}
              onChange={(e) => setFormData({...formData, account_number: e.target.value})}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              placeholder="Routing Number"
              value={formData.routing_number || ''}
              onChange={(e) => setFormData({...formData, routing_number: e.target.value})}
              className="bg-white/10 border-white/20 text-white"
            />
            <Input
              placeholder="Bank Name"
              value={formData.bank_name || ''}
              onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
              className="bg-white/10 border-white/20 text-white"
            />
            <Button
              onClick={() => addMethodMutation.mutate({ bank_details: formData })}
              disabled={!formData.account_holder_name || !formData.account_number}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Add Bank Account
            </Button>
          </div>
        );
      
      case 'paypal':
        return (
          <div className="space-y-4">
            <Input
              placeholder="PayPal Email"
              type="email"
              value={formData.paypal_email || ''}
              onChange={(e) => setFormData({...formData, paypal_email: e.target.value})}
              className="bg-white/10 border-white/20 text-white"
            />
            <Button
              onClick={() => addMethodMutation.mutate({ paypal_email: formData.paypal_email })}
              disabled={!formData.paypal_email}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Add PayPal Account
            </Button>
          </div>
        );
      
      case 'crypto_wallet':
        return (
          <div className="space-y-4">
            <Select
              value={formData.crypto_network || 'ethereum'}
              onValueChange={(v) => setFormData({...formData, crypto_network: v})}
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bitcoin">Bitcoin</SelectItem>
                <SelectItem value="ethereum">Ethereum</SelectItem>
                <SelectItem value="usdc">USDC</SelectItem>
                <SelectItem value="usdt">USDT</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Wallet Address"
              value={formData.crypto_address || ''}
              onChange={(e) => setFormData({...formData, crypto_address: e.target.value})}
              className="bg-white/10 border-white/20 text-white"
            />
            <Button
              onClick={() => addMethodMutation.mutate(formData)}
              disabled={!formData.crypto_address}
              className="w-full bg-yellow-600 hover:bg-yellow-700"
            >
              Add Crypto Wallet
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Method */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Add Payout Method</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? 'Cancel' : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="space-y-4">
                <Select value={methodType} onValueChange={setMethodType}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="crypto_wallet">Crypto Wallet</SelectItem>
                  </SelectContent>
                </Select>

                {renderAddForm()}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Existing Methods */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Your Payout Methods</CardTitle>
        </CardHeader>
        <CardContent>
          {methods.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No payout methods</h3>
              <p className="text-gray-400">Add a payout method to start receiving earnings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {methods.map(method => (
                <div key={method.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    {renderMethodIcon(method.method_type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold capitalize">
                        {method.method_type.replace('_', ' ')}
                      </h3>
                      {method.is_primary && (
                        <Badge className="bg-green-500/20 text-green-300">
                          <Star className="w-3 h-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                      <Badge className={
                        method.status === 'active' ? 'bg-green-500/20 text-green-300' :
                        method.status === 'pending_verification' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-red-500/20 text-red-300'
                      }>
                        {method.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-sm">
                      {method.method_type === 'bank_transfer' && method.bank_details?.bank_name && 
                        `${method.bank_details.bank_name} ••••${method.bank_details.account_number?.slice(-4)}`}
                      {method.method_type === 'paypal' && method.paypal_email}
                      {method.method_type === 'crypto_wallet' && 
                        `${method.crypto_network} ${method.crypto_address?.slice(0, 8)}...`}
                      {method.method_type === 'stripe' && 'Stripe Connected Account'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!method.is_primary && method.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryMutation.mutate(method.id)}
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Remove this payout method?')) {
                          deleteMethodMutation.mutate(method.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard, Building, Bitcoin, Plus,
  Check, Trash2, Star, X, Shield, Wallet, Loader2
} from "lucide-react";
import { toast } from "sonner";

import ManualBankPaymentForm from "./ManualBankPaymentForm";

/* ────────── Direct Card Form (saves card details directly, no Stripe blocking) ────────── */
function DirectCardForm({ onSuccess, onCancel, currentUser }) {
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({
    cardholder_name: currentUser?.full_name || "",
    card_number: "",
    exp_month: "",
    exp_year: "",
    cvv: "",
    zip: ""
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cardNum = form.card_number.replace(/\s/g, "");
    if (!form.cardholder_name.trim()) { toast.error("Enter cardholder name"); return; }
    if (cardNum.length < 13 || cardNum.length > 19) { toast.error("Enter a valid card number"); return; }
    if (!form.exp_month || !form.exp_year) { toast.error("Enter expiration date"); return; }
    if (!form.cvv || form.cvv.length < 3) { toast.error("Enter CVV"); return; }

    setProcessing(true);
    toast.loading("Saving your card...");

    try {
      // Detect brand from card number
      const brand = cardNum.startsWith("4") ? "visa"
        : cardNum.startsWith("5") || (parseInt(cardNum.slice(0,2)) >= 51 && parseInt(cardNum.slice(0,2)) <= 55) ? "mastercard"
        : cardNum.startsWith("34") || cardNum.startsWith("37") ? "amex"
        : cardNum.startsWith("6") ? "discover"
        : "card";

      const response = await base44.functions.invoke('savePaymentMethod', {
        direct_card: {
          last4: cardNum.slice(-4),
          brand,
          exp_month: parseInt(form.exp_month),
          exp_year: parseInt(form.exp_year),
          cardholder_name: form.cardholder_name.trim()
        }
      });

      if (response?.data?.error) throw new Error(response.data.error);

      toast.dismiss();
      toast.success("Card saved successfully!");
      onSuccess(response?.data?.method);
    } catch (err) {
      toast.dismiss();
      toast.error(err.message || "Failed to save card");
      setProcessing(false);
    }
  };

  const formatCardNumber = (val) => {
    return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-gray-400 text-sm mb-1.5 block">Cardholder Name</label>
        <input type="text" value={form.cardholder_name} onChange={e => update("cardholder_name", e.target.value)}
          placeholder="Full name on card"
          className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600" />
      </div>
      <div>
        <label className="text-gray-400 text-sm mb-1.5 block">Card Number</label>
        <input type="text" inputMode="numeric" value={form.card_number}
          onChange={e => update("card_number", formatCardNumber(e.target.value))}
          placeholder="1234 5678 9012 3456" maxLength={19}
          className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-gray-400 text-sm mb-1.5 block">Month</label>
          <input type="text" inputMode="numeric" value={form.exp_month}
            onChange={e => update("exp_month", e.target.value.replace(/\D/g,"").slice(0,2))}
            placeholder="MM" maxLength={2}
            className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600" />
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-1.5 block">Year</label>
          <input type="text" inputMode="numeric" value={form.exp_year}
            onChange={e => update("exp_year", e.target.value.replace(/\D/g,"").slice(0,4))}
            placeholder="YYYY" maxLength={4}
            className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600" />
        </div>
        <div>
          <label className="text-gray-400 text-sm mb-1.5 block">CVV</label>
          <input type="password" inputMode="numeric" value={form.cvv}
            onChange={e => update("cvv", e.target.value.replace(/\D/g,"").slice(0,4))}
            placeholder="•••" maxLength={4}
            className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600" />
        </div>
      </div>
      <p className="text-gray-400 text-xs">
        <Shield className="w-3 h-3 inline mr-1" />
        Card info is saved securely. Visa, Mastercard, Amex, Discover accepted.
      </p>
      <div className="flex gap-3">
        <Button type="button" onClick={onCancel} variant="outline" className="flex-1 border-white/20 text-white" disabled={processing}>Cancel</Button>
        <Button type="submit" className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" disabled={processing}>
          {processing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>) : (<><Shield className="w-4 h-4 mr-2" />Add Card</>)}
        </Button>
      </div>
    </form>
  );
}

/* ────────── Main Component ────────── */
export default function PaymentMethodsManager({ currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [showAddExternal, setShowAddExternal] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [addMode, setAddMode] = useState('card');
  const [externalType, setExternalType] = useState(null);
  const [externalUsername, setExternalUsername] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [savingBank, setSavingBank] = useState(false);

  const handleOpenForm = (mode) => {
    setAddMode(mode);
    setShowAddCard(true);
  };

  const handleSaveManualBank = async (bankData) => {
    const bankName = bankData.bank_name.trim();
    const holderName = bankData.account_holder_name.trim();

    if (!holderName) { toast.error("Enter account holder name"); return; }
    if (!bankName) { toast.error("Enter bank name"); return; }
    if (!/^\d{9}$/.test(bankData.routing_number)) { toast.error("Routing number must be exactly 9 digits"); return; }
    if (bankData.account_number.length < 5 || !/^\d+$/.test(bankData.account_number)) { toast.error("Enter a valid account number"); return; }
    if (bankData.account_number !== bankData.confirm_account_number) { toast.error("Account numbers do not match"); return; }

    setSavingBank(true);
    const response = await base44.functions.invoke('savePaymentMethod', {
      manual_bank: {
        account_type: bankData.account_type,
        bank_name: bankName,
        account_holder_name: holderName,
        routing_number: bankData.routing_number,
        account_number_last4: bankData.account_number.slice(-4)
      }
    });

    if (response?.data?.error) {
      setSavingBank(false);
      toast.error(response.data.error);
      return;
    }

    const savedMethod = response?.data?.method;
    if (savedMethod) {
      queryClient.setQueryData(['payment-methods', currentUser?.email], (old = []) => [savedMethod, ...old]);
    }
    queryClient.refetchQueries({ queryKey: ['payment-methods', currentUser?.email] });
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    setSavingBank(false);
    setShowAddCard(false);
    toast.success("Bank account saved!");
  };

  const { data: paymentMethods = [], isLoading } = useQuery({
    queryKey: ['payment-methods', currentUser?.email],
    queryFn: async () => {
      const methods = await base44.entities.PaymentMethod.filter({ user_email: currentUser.email, status: 'active' });
      return methods.sort((a, b) => {
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        return new Date(b.created_date) - new Date(a.created_date);
      });
    },
    enabled: !!currentUser,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  // Real-time subscription — instantly show any new/updated method for this user
  useEffect(() => {
    if (!currentUser?.email) return;
    const unsub = base44.entities.PaymentMethod.subscribe((event) => {
      if (event.data?.user_email === currentUser.email || event.data?.user_email === currentUser.email) {
        queryClient.refetchQueries({ queryKey: ['payment-methods', currentUser.email] });
      }
    });
    return unsub;
  }, [currentUser?.email, queryClient]);

  const setDefaultMutation = useMutation({
    mutationFn: async (methodId) => {
      await Promise.all(paymentMethods.filter(m => m.id !== methodId).map(m => base44.entities.PaymentMethod.update(m.id, { is_default: false })));
      await base44.entities.PaymentMethod.update(methodId, { is_default: true });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payment-methods', currentUser?.email] }); toast.success("Default payment method set"); },
    onError: () => { toast.error("Failed to set default"); }
  });

  const deleteMutation = useMutation({
    mutationFn: async (methodId) => {
      setDeletingId(methodId);
      const method = paymentMethods.find(m => m.id === methodId);
      // Soft-delete the PaymentMethod
      await base44.entities.PaymentMethod.update(methodId, { status: 'disabled' });
      // Also remove linked BankAccount if it's a bank
      if (method?.type === 'bank_account' && method?.bank_details?.last4) {
        const banks = await base44.entities.BankAccount.filter({ user_email: currentUser.email });
        const matchingBank = banks.find(b => b.account_number_last4 === method.bank_details.last4 && b.bank_name === method.bank_details.bank_name);
        if (matchingBank) {
          await base44.entities.BankAccount.delete(matchingBank.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', currentUser?.email] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success("Payment method removed");
      setDeletingId(null);
    },
    onError: () => { toast.error("Failed to remove payment method"); setDeletingId(null); }
  });

  const addExternalMutation = useMutation({
    mutationFn: async () => {
      const value = externalUsername.trim();
      const record = { user_email: currentUser.email, type: externalType, is_default: paymentMethods.length === 0, status: 'active' };
      if (externalType === 'crypto_wallet') {
        record.crypto_details = { wallet_address: value, network: 'ethereum' };
      } else {
        const isEmail = value.includes('@') && value.includes('.');
        record.external_details = { username: value, email: isEmail ? value : '' };
      }
      return await base44.entities.PaymentMethod.create(record);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payment-methods', currentUser?.email] }); setShowAddExternal(false); setExternalUsername(""); setExternalType(null); toast.success("Payment method added!"); },
    onError: (err) => { toast.error(err?.message || "Failed to add payment method"); }
  });

  const externalLabels = {
    cashapp: { label: 'Cash App', placeholder: '$cashtag or email', hint: 'Enter your $Cashtag (e.g. $johndoe) or linked email.' },
    venmo: { label: 'Venmo', placeholder: '@username or email', hint: 'Enter your Venmo @username or linked email.' },
    paypal: { label: 'PayPal', placeholder: 'PayPal email', hint: 'Enter the email associated with your PayPal account.' },
    crypto_wallet: { label: 'Crypto Wallet', placeholder: 'Wallet address (0x...)', hint: 'Enter your public wallet address.' }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'card': return CreditCard;
      case 'bank_account': return Building;
      case 'cashapp': case 'venmo': case 'paypal': return Wallet;
      case 'crypto_wallet': return Bitcoin;
      default: return CreditCard;
    }
  };

  const getCardBrand = (brand) => ({ visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover" }[brand?.toLowerCase()] || brand);
  const getCardColor = (brand) => ({ visa: "from-blue-600 to-blue-800", mastercard: "from-orange-600 to-red-700", amex: "from-teal-600 to-cyan-700", discover: "from-orange-500 to-yellow-600" }[brand?.toLowerCase()] || "from-gray-700 to-gray-900");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl bg-gray-900 rounded-3xl overflow-hidden max-h-[92vh] flex flex-col" style={{ maxHeight: 'min(92vh, 700px)' }}>
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
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X className="w-6 h-6 text-white" /></button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 pb-10">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
          ) : (
            <>
              {/* Add Buttons */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2"><Plus className="w-5 h-5" />Add New Payment Method</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => handleOpenForm('card')} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-14 text-base font-semibold">
                   <CreditCard className="w-5 h-5 mr-2" />Add Card
                  </Button>
                  <Button onClick={() => handleOpenForm('bank')} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-14 text-base font-semibold">
                   <Building className="w-5 h-5 mr-2" />Add Bank
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['cashapp', 'venmo', 'paypal', 'crypto_wallet'].map((type) => {
                    const colors = { cashapp: 'bg-green-600 hover:bg-green-700', venmo: 'bg-blue-600 hover:bg-blue-700', paypal: 'bg-indigo-600 hover:bg-indigo-700', crypto_wallet: 'bg-orange-600 hover:bg-orange-700' };
                    const labels = { cashapp: 'Cash App', venmo: 'Venmo', paypal: 'PayPal', crypto_wallet: 'Crypto' };
                    const Icon = type === 'crypto_wallet' ? Bitcoin : Wallet;
                    return (
                      <Button key={type} onClick={() => { setExternalType(type); setShowAddExternal(true); }} className={`${colors[type]} h-12`}>
                        <Icon className="w-4 h-4 mr-2" />{labels[type]}
                      </Button>
                    );
                  })}
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-400 text-xs"><Shield className="w-3 h-3 inline mr-1" />All payment methods are encrypted and secure. Apple Pay & Google Pay available at checkout.</p>
                </div>
              </div>

              {/* Add Card Form */}
              <AnimatePresence>
                {showAddCard && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-green-400" />
                          {addMode === 'bank' ? 'Add Bank Account (Secure)' : 'Add Card (Secure)'}
                        </h3>
                        {addMode === 'bank' ? (
                          <ManualBankPaymentForm currentUser={currentUser} saving={savingBank} onSave={handleSaveManualBank} onCancel={() => setShowAddCard(false)} />
                        ) : (
                          <DirectCardForm
                           currentUser={currentUser}
                           onSuccess={(savedMethod) => {
                             setShowAddCard(false);
                             if (savedMethod) {
                               queryClient.setQueryData(['payment-methods', currentUser?.email], (old = []) =>
                                 [savedMethod, ...old.filter(m => m.id !== savedMethod.id)]
                               );
                             }
                             queryClient.refetchQueries({ queryKey: ['payment-methods', currentUser?.email] });
                           }}
                           onCancel={() => setShowAddCard(false)}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add External Account Form */}
              <AnimatePresence>
                {showAddExternal && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <h3 className="text-white font-semibold mb-2">Add {externalLabels[externalType]?.label || 'Account'}</h3>
                        <p className="text-gray-400 text-xs mb-4">{externalLabels[externalType]?.hint}</p>
                        <div className="space-y-4">
                          <Input placeholder={externalLabels[externalType]?.placeholder || 'Username or email'} value={externalUsername} onChange={(e) => setExternalUsername(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                          <div className="flex gap-2">
                            <Button onClick={() => addExternalMutation.mutate()} disabled={!externalUsername.trim() || addExternalMutation.isPending} className="flex-1 bg-green-600 hover:bg-green-700">
                              {addExternalMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> : <><Check className="w-4 h-4 mr-2" />Add Account</>}
                            </Button>
                            <Button onClick={() => { setShowAddExternal(false); setExternalUsername(""); }} variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10">Cancel</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Saved Payment Methods List */}
              {paymentMethods.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-white font-semibold text-lg flex items-center gap-2"><CreditCard className="w-5 h-5" />Saved Payment Methods ({paymentMethods.length})</h3>
                  <AnimatePresence>
                    {paymentMethods.map((method) => {
                      const Icon = getIcon(method.type);
                      const isDeleting = deletingId === method.id;
                      return (
                        <motion.div key={method.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}>
                          {method.type === 'card' && method.card_details ? (
                            <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${getCardColor(method.card_details.brand)} p-6 shadow-lg ${method.is_default ? 'ring-2 ring-green-500' : ''}`}>
                              <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-2">
                                  <Icon className="w-6 h-6 text-white" />
                                  {method.is_default && <Badge className="bg-white/20 text-white border-0"><Star className="w-3 h-3 mr-1 fill-yellow-300 text-yellow-300" />Default</Badge>}
                                </div>
                                <div className="flex items-center gap-2">
                                  {!method.is_default && <button onClick={() => setDefaultMutation.mutate(method.id)} className="p-2 hover:bg-white/20 rounded-lg transition" title="Set as default"><Star className="w-5 h-5 text-white" /></button>}
                                  <button onClick={() => deleteMutation.mutate(method.id)} disabled={isDeleting} className="p-2 hover:bg-red-500/30 rounded-lg transition disabled:opacity-50">
                                    {isDeleting ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Trash2 className="w-5 h-5 text-white" />}
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <p className="text-white/90 text-2xl font-mono tracking-widest">•••• •••• •••• {method.card_details.last4}</p>
                                <div className="flex items-center justify-between">
                                  <div><p className="text-white/70 text-xs">Expires</p><p className="text-white font-semibold">{String(method.card_details.exp_month).padStart(2, '0')}/{method.card_details.exp_year}</p></div>
                                  <p className="text-white font-bold text-xl">{getCardBrand(method.card_details.brand)}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Card className={`bg-white/5 border-white/10 ${method.is_default ? 'ring-2 ring-green-500' : ''}`}>
                              <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center"><Icon className="w-6 h-6 text-purple-400" /></div>
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-white font-semibold capitalize">{method.type.replace('_', ' ')}</h4>
                                        {method.is_default && <Badge className="bg-green-500/20 text-green-400 text-xs border-0"><Star className="w-3 h-3 mr-1 fill-green-400" />Default</Badge>}
                                      </div>
                                      <p className="text-gray-400 text-sm break-all">
                                        {method.card_details && `•••• ${method.card_details.last4}`}
                                        {method.bank_details && `${method.bank_details.bank_name} •••• ${method.bank_details.last4}`}
                                        {method.external_details && (method.external_details.username || method.external_details.email)}
                                        {method.crypto_details && `${method.crypto_details.wallet_address?.slice(0, 6)}...${method.crypto_details.wallet_address?.slice(-4)}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {!method.is_default && <button onClick={() => setDefaultMutation.mutate(method.id)} className="p-2 hover:bg-white/10 rounded-full transition" title="Set as default"><Star className="w-5 h-5 text-gray-400 hover:text-yellow-400" /></button>}
                                    <button onClick={() => deleteMutation.mutate(method.id)} disabled={isDeleting} className="p-2 hover:bg-white/10 rounded-full transition disabled:opacity-50" title="Remove">
                                      {isDeleting ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-400" />}
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
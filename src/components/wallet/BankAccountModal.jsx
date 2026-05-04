import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { X, Building, Plus, Trash2, CheckCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function BankAccountModal({ currentUser, onClose }) {
  const qc = useQueryClient();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    account_type: "checking",
    bank_name: "",
    routing_number: "",
    account_number_last4: ""
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts", currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.BankAccount.filter({ user_email: currentUser.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const addAccountMutation = useMutation({
    mutationFn: (data) => base44.entities.BankAccount.create({
      ...data,
      user_email: currentUser.email,
      is_verified: false,
      is_primary: accounts.length === 0
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      setShowAddAccount(false);
      setAccountForm({
        account_type: "checking",
        bank_name: "",
        routing_number: "",
        account_number_last4: ""
      });
      toast.success('Bank account added successfully!');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to add bank account');
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id) => base44.entities.BankAccount.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success('Bank account removed');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to remove account');
    }
  });

  return (
    <AnimatePresence>
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
          className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Bank Accounts</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {!showAddAccount && (
              <Button
                onClick={() => setShowAddAccount(true)}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 py-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                Link Bank Account
              </Button>
            )}

            {showAddAccount && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-white font-bold text-lg">Link Bank Account</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Account Type</label>
                      <select
                        value={accountForm.account_type}
                        onChange={(e) => setAccountForm({...accountForm, account_type: e.target.value})}
                        className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2"
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                        <option value="business">Business</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Bank Name</label>
                      <Input
                        value={accountForm.bank_name}
                        onChange={(e) => setAccountForm({...accountForm, bank_name: e.target.value})}
                        placeholder="Chase, Bank of America, etc."
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Routing Number</label>
                      <Input
                        value={accountForm.routing_number}
                        onChange={(e) => setAccountForm({...accountForm, routing_number: e.target.value})}
                        placeholder="9 digits"
                        maxLength="9"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Account Number (Last 4)</label>
                      <Input
                        value={accountForm.account_number_last4}
                        onChange={(e) => setAccountForm({...accountForm, account_number_last4: e.target.value})}
                        placeholder="1234"
                        maxLength="4"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowAddAccount(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (!accountForm.bank_name || !accountForm.routing_number || !accountForm.account_number_last4) {
                          toast.error('Please fill in all fields');
                          return;
                        }
                        if (accountForm.routing_number.length !== 9) {
                          toast.error('Routing number must be 9 digits');
                          return;
                        }
                        if (accountForm.account_number_last4.length !== 4) {
                          toast.error('Account number last 4 must be 4 digits');
                          return;
                        }
                        addAccountMutation.mutate(accountForm);
                      }}
                      disabled={addAccountMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {addAccountMutation.isPending ? 'Linking...' : 'Link Account'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {accounts.map((account) => (
                <Card key={account.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                          <Building className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-bold">{account.bank_name}</h4>
                          <p className="text-gray-400 text-sm capitalize">{account.account_type}</p>
                          <p className="text-gray-500 text-xs">••••{account.account_number_last4}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {account.is_verified ? (
                              <div className="flex items-center gap-1 text-green-400 text-xs">
                                <CheckCircle className="w-3 h-3" />
                                Verified
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-yellow-400 text-xs">
                                <Clock className="w-3 h-3" />
                                Pending Verification
                              </div>
                            )}
                            {account.is_primary && (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full">
                                Primary
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteAccountMutation.mutate(account.id)}
                        className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {accounts.length === 0 && !showAddAccount && (
              <div className="text-center py-12">
                <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No bank accounts linked yet</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
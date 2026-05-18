import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Building, Plus, Trash2, CheckCircle, Clock, Lock, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const COMMON_BANKS = ["Chase", "Bank of America", "Wells Fargo", "Citibank", "US Bank", "PNC", "Capital One", "TD Bank", "Truist", "SunTrust", "Other"];

export default function BankAccountModal({ currentUser, onClose }) {
  const qc = useQueryClient();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showRouting, setShowRouting] = useState(false);
  const [form, setForm] = useState({
    account_type: "checking",
    bank_name: "",
    account_holder_name: "",
    routing_number: "",
    account_number: "",
    confirm_account_number: "",
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts", currentUser?.email],
    queryFn: () => base44.entities.BankAccount.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.BankAccount.create({
      user_email: currentUser.email,
      account_type: data.account_type,
      bank_name: data.bank_name,
      account_holder_name: data.account_holder_name,
      routing_number: data.routing_number,
      account_number_last4: data.account_number.slice(-4),
      is_verified: false,
      is_primary: accounts.length === 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      setShowAddAccount(false);
      setForm({ account_type: "checking", bank_name: "", account_holder_name: "", routing_number: "", account_number: "", confirm_account_number: "" });
      toast.success("Bank account linked! Verification may take 1-2 business days.");
    },
    onError: (err) => toast.error(err?.message || "Failed to link account"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BankAccount.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Bank account removed");
    },
  });

  const handleSubmit = () => {
    if (!form.account_holder_name.trim()) { toast.error("Enter account holder name"); return; }
    if (!form.bank_name) { toast.error("Select your bank"); return; }
    if (!/^\d{9}$/.test(form.routing_number)) { toast.error("Routing number must be exactly 9 digits"); return; }
    if (form.account_number.length < 5 || !/^\d+$/.test(form.account_number)) { toast.error("Enter a valid account number"); return; }
    if (form.account_number !== form.confirm_account_number) { toast.error("Account numbers do not match"); return; }
    addMutation.mutate(form);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-gray-950 sm:rounded-3xl rounded-t-3xl overflow-hidden max-h-[95vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-950 border-b border-white/10 px-5 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Building className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Bank Accounts</h2>
                <p className="text-gray-500 text-xs">{accounts.length} account{accounts.length !== 1 ? "s" : ""} linked</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <AnimatePresence>
              {showAddAccount && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white font-semibold">Link Bank Account</h3>
                    <div className="flex items-center gap-1.5 text-green-400 text-xs">
                      <Lock className="w-3 h-3" />
                      256-bit Encrypted
                    </div>
                  </div>

                  {/* Account Type */}
                  <div className="flex gap-2">
                    {["checking", "savings", "business"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setForm({ ...form, account_type: t })}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${
                          form.account_type === t
                            ? "bg-green-500/20 text-green-300 border border-green-500/40"
                            : "bg-white/5 text-gray-400 border border-white/10"
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Account Holder Name */}
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Account Holder Name</label>
                    <Input
                      value={form.account_holder_name}
                      onChange={(e) => setForm({ ...form, account_holder_name: e.target.value })}
                      placeholder="Full name as it appears on account"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  {/* Bank Name */}
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Bank Name</label>
                    <select
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-sm"
                    >
                      <option value="" disabled>Select your bank</option>
                      {COMMON_BANKS.map((b) => (
                        <option key={b} value={b} className="bg-gray-900">{b}</option>
                      ))}
                    </select>
                    {form.bank_name === "Other" && (
                      <Input
                        className="bg-white/10 border-white/20 text-white mt-2"
                        placeholder="Enter bank name"
                        onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      />
                    )}
                  </div>

                  {/* Routing Number */}
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Routing Number (9 digits)</label>
                    <div className="relative">
                      <Input
                        value={form.routing_number}
                        onChange={(e) => setForm({ ...form, routing_number: e.target.value.replace(/\D/g, "").slice(0, 9) })}
                        placeholder="123456789"
                        inputMode="numeric"
                        type={showRouting ? "text" : "password"}
                        className="bg-white/10 border-white/20 text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRouting(!showRouting)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showRouting ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">Found at the bottom left of your check</p>
                  </div>

                  {/* Account Number */}
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Account Number</label>
                    <div className="relative">
                      <Input
                        value={form.account_number}
                        onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, "").slice(0, 17) })}
                        placeholder="Enter full account number"
                        inputMode="numeric"
                        type={showAccountNumber ? "text" : "password"}
                        className="bg-white/10 border-white/20 text-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccountNumber(!showAccountNumber)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showAccountNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Account Number */}
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Confirm Account Number</label>
                    <Input
                      value={form.confirm_account_number}
                      onChange={(e) => setForm({ ...form, confirm_account_number: e.target.value.replace(/\D/g, "").slice(0, 17) })}
                      placeholder="Re-enter account number"
                      inputMode="numeric"
                      type="password"
                      className="bg-white/10 border-white/20 text-white"
                    />
                    {form.confirm_account_number && form.account_number !== form.confirm_account_number && (
                      <p className="text-red-400 text-xs mt-1">Account numbers do not match</p>
                    )}
                    {form.confirm_account_number && form.account_number === form.confirm_account_number && form.account_number.length > 0 && (
                      <p className="text-green-400 text-xs mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Account numbers match</p>
                    )}
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-yellow-300 text-xs">
                    Micro-deposits of $0.01–$0.99 will be sent to verify your account within 1-2 business days.
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" onClick={() => setShowAddAccount(false)} className="flex-1 border-white/20 bg-transparent text-white">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={addMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {addMutation.isPending ? "Linking..." : "Link Account"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showAddAccount && (
              <button
                onClick={() => setShowAddAccount(true)}
                className="w-full border-2 border-dashed border-white/20 rounded-2xl py-4 flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:border-white/40 transition"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Link Bank Account</span>
              </button>
            )}

            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-green-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="text-white font-semibold">{account.bank_name}</div>
                      {account.account_holder_name && (
                        <div className="text-gray-400 text-xs">{account.account_holder_name}</div>
                      )}
                      <div className="text-gray-400 text-sm capitalize">{account.account_type} ••••{account.account_number_last4}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {account.is_verified ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs bg-green-500/10 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-400 text-xs bg-yellow-500/10 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                        {account.is_primary && (
                          <span className="text-blue-400 text-xs bg-blue-500/10 px-2 py-0.5 rounded-full">Primary</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(account.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {accounts.length === 0 && !showAddAccount && (
              <div className="text-center py-10">
                <Building className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No bank accounts linked</p>
                <p className="text-gray-600 text-sm">Link an account for withdrawals and payouts</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
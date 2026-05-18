import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, CreditCard, Plus, Trash2, Shield, Lock, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const brandColors = {
  visa: "from-blue-700 to-blue-900",
  mastercard: "from-orange-600 to-red-700",
  amex: "from-green-600 to-teal-700",
  discover: "from-purple-600 to-pink-700",
};

function detectBrand(number) {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]|^2[2-7]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^6/.test(n)) return "discover";
  return "visa";
}

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export default function CardManagementModal({ currentUser, onClose }) {
  const qc = useQueryClient();
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardholder_name: "",
    card_number: "",
    exp_month: "",
    exp_year: "",
    cvv: "",
    billing_zip: "",
    card_type: "debit",
  });

  const { data: cards = [] } = useQuery({
    queryKey: ["payment-cards", currentUser?.email],
    queryFn: () => base44.entities.PaymentCard.filter({ user_email: currentUser.email }),
  });

  const addCardMutation = useMutation({
    mutationFn: (data) => {
      const digits = data.card_number.replace(/\s/g, "");
      return base44.entities.PaymentCard.create({
        user_email: currentUser.email,
        cardholder_name: data.cardholder_name,
        last4: digits.slice(-4),
        brand: detectBrand(digits),
        exp_month: data.exp_month,
        exp_year: data.exp_year,
        card_type: data.card_type,
        billing_zip: data.billing_zip,
        is_primary: cards.length === 0,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-cards"] });
      setShowAddCard(false);
      setCardForm({ cardholder_name: "", card_number: "", exp_month: "", exp_year: "", cvv: "", billing_zip: "", card_type: "debit" });
      toast.success("Card added successfully!");
    },
    onError: (err) => toast.error(err?.message || "Failed to add card"),
  });

  const deleteCardMutation = useMutation({
    mutationFn: (id) => base44.entities.PaymentCard.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-cards"] });
      toast.success("Card removed");
    },
  });

  const handleSubmit = () => {
    const digits = cardForm.card_number.replace(/\s/g, "");
    if (!cardForm.cardholder_name.trim()) { toast.error("Enter cardholder name"); return; }
    if (digits.length < 15) { toast.error("Enter a valid card number"); return; }
    if (!cardForm.exp_month || !cardForm.exp_year) { toast.error("Enter expiration date"); return; }
    if (!cardForm.cvv || cardForm.cvv.length < 3) { toast.error("Enter CVV"); return; }
    if (!cardForm.billing_zip || cardForm.billing_zip.length < 5) { toast.error("Enter billing ZIP code"); return; }
    addCardMutation.mutate(cardForm);
  };

  const detectedBrand = detectBrand(cardForm.card_number.replace(/\s/g, ""));

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
              <div className="w-9 h-9 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Payment Cards</h2>
                <p className="text-gray-500 text-xs">{cards.length} card{cards.length !== 1 ? "s" : ""} saved</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Add Card Form */}
            <AnimatePresence>
              {showAddCard && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white font-semibold">Add New Card</h3>
                    <div className="flex items-center gap-1.5 text-green-400 text-xs">
                      <Lock className="w-3 h-3" />
                      Secure & Encrypted
                    </div>
                  </div>

                  {/* Card preview */}
                  <div className={`rounded-2xl p-5 bg-gradient-to-br ${brandColors[detectedBrand]} relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-10 translate-x-10" />
                    <div className="relative">
                      <div className="text-white/70 text-xs mb-3">{cardForm.card_type === "credit" ? "CREDIT" : "DEBIT"}</div>
                      <div className="text-white font-mono text-lg tracking-widest mb-4">
                        {cardForm.card_number || "•••• •••• •••• ••••"}
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-white/60 text-xs">Card Holder</div>
                          <div className="text-white font-semibold text-sm">{cardForm.cardholder_name || "YOUR NAME"}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white/60 text-xs">Expires</div>
                          <div className="text-white text-sm">{cardForm.exp_month || "MM"}/{cardForm.exp_year || "YY"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Type */}
                  <div className="flex gap-2">
                    {["debit", "credit"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setCardForm({ ...cardForm, card_type: t })}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                          cardForm.card_type === t
                            ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                            : "bg-white/5 text-gray-400 border border-white/10"
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Fields */}
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Cardholder Name</label>
                    <Input
                      value={cardForm.cardholder_name}
                      onChange={(e) => setCardForm({ ...cardForm, cardholder_name: e.target.value })}
                      placeholder="John Smith"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Card Number</label>
                    <Input
                      value={cardForm.card_number}
                      onChange={(e) => setCardForm({ ...cardForm, card_number: formatCardNumber(e.target.value) })}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      inputMode="numeric"
                      className="bg-white/10 border-white/20 text-white font-mono tracking-wider"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-gray-400 text-xs mb-1.5 block">Month</label>
                      <Input
                        value={cardForm.exp_month}
                        onChange={(e) => setCardForm({ ...cardForm, exp_month: e.target.value.slice(0, 2) })}
                        placeholder="MM"
                        maxLength={2}
                        inputMode="numeric"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1.5 block">Year</label>
                      <Input
                        value={cardForm.exp_year}
                        onChange={(e) => setCardForm({ ...cardForm, exp_year: e.target.value.slice(0, 2) })}
                        placeholder="YY"
                        maxLength={2}
                        inputMode="numeric"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1.5 block">CVV</label>
                      <Input
                        value={cardForm.cvv}
                        onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.slice(0, 4) })}
                        placeholder="•••"
                        maxLength={4}
                        inputMode="numeric"
                        type="password"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Billing ZIP Code</label>
                    <Input
                      value={cardForm.billing_zip}
                      onChange={(e) => setCardForm({ ...cardForm, billing_zip: e.target.value.slice(0, 10) })}
                      placeholder="10001"
                      inputMode="numeric"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" onClick={() => setShowAddCard(false)} className="flex-1 border-white/20 bg-transparent text-white">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={addCardMutation.isPending}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {addCardMutation.isPending ? "Saving..." : "Add Card"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add button */}
            {!showAddCard && (
              <button
                onClick={() => setShowAddCard(true)}
                className="w-full border-2 border-dashed border-white/20 rounded-2xl py-4 flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:border-white/40 transition"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add New Card</span>
              </button>
            )}

            {/* Card list */}
            <div className="space-y-3">
              {cards.map((card) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative bg-gradient-to-br ${brandColors[card.brand] || brandColors.visa} rounded-2xl p-5 overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <div className="text-white/60 text-xs mb-2 uppercase">{card.brand} {card.card_type}</div>
                      <div className="text-white font-mono text-lg tracking-widest mb-3">•••• •••• •••• {card.last4}</div>
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-white/60 text-xs">Expires</div>
                          <div className="text-white text-sm">{card.exp_month}/{card.exp_year}</div>
                        </div>
                        {card.cardholder_name && (
                          <div>
                            <div className="text-white/60 text-xs">Name</div>
                            <div className="text-white text-sm">{card.cardholder_name}</div>
                          </div>
                        )}
                        {card.is_primary && (
                          <span className="flex items-center gap-1 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Primary
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCardMutation.mutate(card.id)}
                      className="p-2 bg-black/30 hover:bg-black/50 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {cards.length === 0 && !showAddCard && (
              <div className="text-center py-10">
                <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No cards saved yet</p>
                <p className="text-gray-600 text-sm">Add a debit or credit card to get started</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { X, CreditCard, Plus, Trash2, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CardManagementModal({ currentUser, onClose }) {
  const qc = useQueryClient();
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardForm, setCardForm] = useState({
    card_type: "debit",
    last4: "",
    brand: "visa",
    exp_month: "",
    exp_year: ""
  });

  const { data: cards = [] } = useQuery({
    queryKey: ["payment-cards"],
    queryFn: () => base44.entities.PaymentCard.filter({ user_email: currentUser.email })
  });

  const addCardMutation = useMutation({
    mutationFn: (data) => base44.entities.PaymentCard.create({
      ...data,
      user_email: currentUser.email
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-cards"] });
      setShowAddCard(false);
      setCardForm({ card_type: "debit", last4: "", brand: "visa", exp_month: "", exp_year: "" });
      toast.success("Card added successfully!");
    },
    onError: (err) => toast.error(err?.message || "Failed to add card")
  });

  const deleteCardMutation = useMutation({
    mutationFn: (id) => base44.entities.PaymentCard.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-cards"] });
      toast.success("Card removed");
    }
  });

  const brandColors = {
    visa: "from-blue-600 to-blue-800",
    mastercard: "from-orange-600 to-red-600",
    amex: "from-green-600 to-teal-600",
    discover: "from-purple-600 to-pink-600"
  };

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
          <div className="bg-gradient-to-r from-orange-600 to-pink-600 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">My Cards</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Add Card Button */}
            {!showAddCard && (
              <Button
                onClick={() => setShowAddCard(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Card
              </Button>
            )}

            {/* Add Card Form */}
            {showAddCard && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-white font-bold text-lg">Add Payment Card</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Card Type</label>
                      <select
                        value={cardForm.card_type}
                        onChange={(e) => setCardForm({...cardForm, card_type: e.target.value})}
                        className="w-full bg-gray-800 border border-white/20 text-white rounded-lg px-3 py-2"
                      >
                        <option value="debit" className="bg-gray-800">Debit Card</option>
                        <option value="credit" className="bg-gray-800">Credit Card</option>
                        <option value="virtual" className="bg-gray-800">Virtual Card</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Brand</label>
                      <select
                        value={cardForm.brand}
                        onChange={(e) => setCardForm({...cardForm, brand: e.target.value})}
                        className="w-full bg-gray-800 border border-white/20 text-white rounded-lg px-3 py-2"
                      >
                        <option value="visa" className="bg-gray-800">Visa</option>
                        <option value="mastercard" className="bg-gray-800">Mastercard</option>
                        <option value="amex" className="bg-gray-800">American Express</option>
                        <option value="discover" className="bg-gray-800">Discover</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Last 4 Digits</label>
                      <Input
                        value={cardForm.last4}
                        onChange={(e) => setCardForm({...cardForm, last4: e.target.value})}
                        placeholder="1234"
                        maxLength="4"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Exp Month</label>
                        <Input
                          type="number"
                          value={cardForm.exp_month}
                          onChange={(e) => setCardForm({...cardForm, exp_month: e.target.value})}
                          placeholder="12"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">Year</label>
                        <Input
                          type="number"
                          value={cardForm.exp_year}
                          onChange={(e) => setCardForm({...cardForm, exp_year: e.target.value})}
                          placeholder="2025"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowAddCard(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                     onClick={() => {
                       if (!cardForm.last4 || cardForm.last4.length !== 4) {
                         toast.error("Enter the last 4 digits of your card");
                         return;
                       }
                       if (!cardForm.exp_month || !cardForm.exp_year) {
                         toast.error("Enter card expiration date");
                         return;
                       }
                       addCardMutation.mutate(cardForm);
                     }}
                     disabled={addCardMutation.isPending}
                     className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                     {addCardMutation.isPending ? "Saving..." : "Add Card"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card List */}
            <div className="space-y-4">
              {cards.map((card) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative bg-gradient-to-r ${brandColors[card.brand]} rounded-2xl p-6 overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <CreditCard className="w-8 h-8 text-white" />
                      <button
                        onClick={() => deleteCardMutation.mutate(card.id)}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    <div className="text-white text-2xl font-mono mb-4">
                      •••• •••• •••• {card.last4}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white/80 text-xs">Expires</div>
                        <div className="text-white font-medium">
                          {card.exp_month}/{card.exp_year}
                        </div>
                      </div>
                      <div className="text-white font-bold uppercase">
                        {card.brand}
                      </div>
                    </div>
                    {card.is_primary && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-white/20 rounded-full text-white text-xs font-bold">
                        PRIMARY
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {cards.length === 0 && !showAddCard && (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No cards added yet</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
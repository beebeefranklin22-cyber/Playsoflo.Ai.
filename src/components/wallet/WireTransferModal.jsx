import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Building2, AlertTriangle, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function WireTransferModal({ currentUser, onClose }) {
  const [formData, setFormData] = useState({
    recipient_name: "",
    recipient_bank: "",
    recipient_account: "",
    routing_number: "",
    swift_code: "",
    amount: "",
    reference: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.recipient_name || !formData.amount || !formData.recipient_account) {
      alert("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (amount < 10) {
      alert("Minimum wire transfer amount is $10");
      return;
    }

    setLoading(true);
    try {
      // Create wire transfer record
      await base44.entities.Payment.create({
        amount_usd: amount,
        amount_rri: 0,
        method: "wire_transfer",
        status: "pending",
        reference_type: "wire_transfer",
        memo: `Wire to ${formData.recipient_name} - ${formData.reference}`,
        metadata: {
          recipient_name: formData.recipient_name,
          recipient_bank: formData.recipient_bank,
          recipient_account: formData.recipient_account,
          routing_number: formData.routing_number,
          swift_code: formData.swift_code
        }
      });

      // Create notification
      await base44.entities.Notification.create({
        recipient_email: currentUser.email,
        type: "wire_transfer",
        title: "Wire Transfer Initiated",
        message: `Wire transfer of $${amount} to ${formData.recipient_name} is being processed`,
        reference_type: "payment"
      });

      alert("Wire transfer initiated. Processing time: 1-3 business days");
      onClose();
    } catch (err) {
      console.error("Wire transfer failed:", err);
      alert("Failed to initiate wire transfer: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden my-8"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Wire Transfer</h2>
                  <p className="text-white/80 text-sm">International & domestic transfers</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-300 text-sm font-semibold mb-1">Important</p>
                <p className="text-yellow-200 text-sm">
                  Wire transfers typically take 1-3 business days. Minimum amount: $10. 
                  International transfers may incur additional fees.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-white font-semibold mb-2 block">
                  Recipient Name *
                </label>
                <Input
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({...formData, recipient_name: e.target.value})}
                  placeholder="John Doe"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="text-white font-semibold mb-2 block">
                  Bank Name
                </label>
                <Input
                  value={formData.recipient_bank}
                  onChange={(e) => setFormData({...formData, recipient_bank: e.target.value})}
                  placeholder="Bank of America"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="text-white font-semibold mb-2 block">
                  Account Number *
                </label>
                <Input
                  value={formData.recipient_account}
                  onChange={(e) => setFormData({...formData, recipient_account: e.target.value})}
                  placeholder="1234567890"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="text-white font-semibold mb-2 block">
                  Routing Number
                </label>
                <Input
                  value={formData.routing_number}
                  onChange={(e) => setFormData({...formData, routing_number: e.target.value})}
                  placeholder="021000021"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="text-white font-semibold mb-2 block">
                  SWIFT/BIC Code
                </label>
                <Input
                  value={formData.swift_code}
                  onChange={(e) => setFormData({...formData, swift_code: e.target.value})}
                  placeholder="BOFAUS3N (for international)"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="text-white font-semibold mb-2 block">
                  Amount (USD) *
                </label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  min="10"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">
                Reference/Memo
              </label>
              <Input
                value={formData.reference}
                onChange={(e) => setFormData({...formData, reference: e.target.value})}
                placeholder="Invoice #12345"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-300 text-sm font-semibold mb-1">Secure Transfer</p>
                <p className="text-green-200 text-sm">
                  All wire transfers are encrypted and verified through our banking partners.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 py-6 text-lg"
              >
                {loading ? "Processing..." : "Initiate Wire Transfer"}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
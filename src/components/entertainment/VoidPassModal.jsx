import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function VoidPassModal({ isOpen, onClose, ticket, voidPolicies, currentUser }) {
  const queryClient = useQueryClient();
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [notes, setNotes] = useState("");

  const voidTicketMutation = useMutation({
    mutationFn: async () => {
      // Update ticket status
      await base44.entities.EntertainmentTicket.update(ticket.id, {
        status: 'cancelled',
        special_instructions: `VOIDED: ${selectedPolicy.reason}. Notes: ${notes}`
      });

      // Calculate refund amount
      const refundAmount = (ticket.price_paid * selectedPolicy.refund_percent) / 100;

      // Send notification to customer
      await base44.integrations.Core.SendEmail({
        to: ticket.buyer_email,
        subject: `Pass Voided - ${ticket.experience_title}`,
        body: `
          <h1>Pass Cancellation Notice</h1>
          <p>Your pass has been voided by the provider.</p>
          <p><strong>Pass Number:</strong> ${ticket.ticket_number}</p>
          <p><strong>Experience:</strong> ${ticket.experience_title}</p>
          <p><strong>Reason:</strong> ${selectedPolicy.reason}</p>
          ${notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ''}
          <hr/>
          <p><strong>Refund:</strong> ${selectedPolicy.refund_percent}% ($${refundAmount.toFixed(2)})</p>
          ${refundAmount > 0 ? '<p>Your refund will be processed within 5-7 business days.</p>' : '<p>No refund will be issued per the voiding policy.</p>'}
        `
      });

      // If refund needed, add to customer wallet
      if (refundAmount > 0) {
        const customerUser = await base44.asServiceRole.entities.User.filter({ email: ticket.buyer_email });
        if (customerUser.length > 0) {
          const currentBalance = customerUser[0].soflo_balance || 0;
          await base44.asServiceRole.entities.User.update(customerUser[0].id, {
            soflo_balance: currentBalance + refundAmount
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sold-tickets']);
      toast.success('Pass voided and customer notified');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to void pass: ' + error.message);
    }
  });

  if (!isOpen) return null;

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
          className="w-full max-w-lg bg-gray-900 rounded-3xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <AlertTriangle className="w-7 h-7 text-red-400" />
              Void Pass
            </h2>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-white font-semibold mb-2">Pass: {ticket.ticket_number}</p>
              <p className="text-gray-300 text-sm">Customer: {ticket.buyer_name}</p>
              <p className="text-gray-300 text-sm">Amount Paid: ${ticket.price_paid}</p>
            </div>

            <div>
              <label className="text-white font-semibold mb-2 block">Select Voiding Reason</label>
              <Select onValueChange={(value) => {
                const policy = voidPolicies[Number(value)];
                setSelectedPolicy(policy);
              }}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent>
                  {voidPolicies.map((policy, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {policy.reason} ({policy.refund_percent}% refund)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPolicy && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-300 text-sm font-semibold mb-1">Refund Calculation</p>
                <p className="text-white text-lg">
                  ${((ticket.price_paid * selectedPolicy.refund_percent) / 100).toFixed(2)} 
                  <span className="text-gray-400 text-sm ml-2">({selectedPolicy.refund_percent}% of ${ticket.price_paid})</span>
                </p>
              </div>
            )}

            <div>
              <label className="text-white font-semibold mb-2 block">Additional Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about the voiding..."
                rows={3}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => voidTicketMutation.mutate()}
                disabled={!selectedPolicy || voidTicketMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {voidTicketMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Void Pass'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
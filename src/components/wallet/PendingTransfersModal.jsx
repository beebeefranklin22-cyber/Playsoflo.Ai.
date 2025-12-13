import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Clock, Building, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PendingTransfersModal({ currentUser, onClose }) {
  const queryClient = useQueryClient();

  const { data: pendingTransfers = [] } = useQuery({
    queryKey: ['pending-transfers', currentUser?.email],
    queryFn: () => base44.entities.Payment.filter({
      status: 'pending',
      reference_type: 'deposit'
    }),
    enabled: !!currentUser
  });

  const completeMutation = useMutation({
    mutationFn: async (transfer) => {
      // Update payment status
      await base44.entities.Payment.update(transfer.id, {
        status: 'completed'
      });

      // Update user balance
      const currentBalance = currentUser.usd_balance || 0;
      await base44.auth.updateMe({
        usd_balance: currentBalance + transfer.amount_usd
      });
      
      return transfer.amount_usd;
    },
    onSuccess: (addedAmount) => {
      queryClient.invalidateQueries(['pending-transfers']);
      queryClient.invalidateQueries(['payments']);
      queryClient.invalidateQueries(['transactions']);
      toast.success(`✓ Transfer completed! $${addedAmount.toFixed(2)} added to your wallet.`);
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to complete transfer");
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (transferId) => {
      await base44.entities.Payment.update(transferId, {
        status: 'failed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-transfers']);
      toast.success("Transfer cancelled");
    }
  });

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
          <div>
            <h2 className="text-2xl font-bold text-white">Pending Transfers</h2>
            <p className="text-gray-400 text-sm">Mark transfers as complete once you've sent the money</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          {pendingTransfers.map((transfer) => (
            <Card key={transfer.id} className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-semibold">
                          ${transfer.amount_usd.toFixed(2)}
                        </h4>
                        <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{transfer.memo}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Building className="w-3 h-3" />
                        <span>{transfer.method === 'bank' ? 'Bank Transfer' : transfer.method}</span>
                        <span>•</span>
                        <span>{format(new Date(transfer.created_date), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      onClick={() => completeMutation.mutate(transfer)}
                      disabled={completeMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Complete
                    </Button>
                    <button
                      onClick={() => cancelMutation.mutate(transfer.id)}
                      disabled={cancelMutation.isPending}
                      className="p-2 hover:bg-white/10 rounded-full"
                      title="Cancel transfer"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {pendingTransfers.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No pending transfers</p>
              <p className="text-gray-500 text-sm mt-2">
                Initiate a bank transfer to see it here
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
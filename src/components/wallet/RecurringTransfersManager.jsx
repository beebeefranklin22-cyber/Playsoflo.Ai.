import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, ArrowRight, Trash2, Edit, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function RecurringTransfersManager({ currentUser, onClose }) {
  const [activeTab, setActiveTab] = useState("list");
  const [editingTransfer, setEditingTransfer] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    type: "deposit",
    amount: "",
    frequency: "monthly",
    start_date: new Date().toISOString().split('T')[0],
    payment_method: "bank",
    destination: currentUser.email,
    description: "",
    is_active: true
  });

  const { data: recurringTransfers = [] } = useQuery({
    queryKey: ['recurring-transfers', currentUser.email],
    queryFn: async () => {
      const transfers = await base44.entities.Payment.filter({
        created_by: currentUser.email,
        reference_type: "recurring"
      });
      return transfers.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!currentUser
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Payment.create({
        ...data,
        status: "scheduled",
        reference_type: "recurring",
        next_execution_date: data.start_date
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['recurring-transfers']);
      setActiveTab("list");
      setFormData({
        type: "deposit",
        amount: "",
        frequency: "monthly",
        start_date: new Date().toISOString().split('T')[0],
        payment_method: "bank",
        destination: currentUser.email,
        description: "",
        is_active: true
      });
      toast.success("Recurring transfer created!");
    },
    onError: () => toast.error("Failed to create transfer")
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      return await base44.entities.Payment.update(id, { 
        is_active,
        status: is_active ? "scheduled" : "paused"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['recurring-transfers']);
      toast.success("Transfer updated!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Payment.update(id, { 
        status: "cancelled",
        is_active: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['recurring-transfers']);
      toast.success("Transfer cancelled!");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    createMutation.mutate({
      ...formData,
      amount_usd: parseFloat(formData.amount),
      memo: formData.description || `Recurring ${formData.type}`
    });
  };

  const getFrequencyLabel = (freq) => {
    const labels = {
      daily: "Daily",
      weekly: "Weekly",
      biweekly: "Every 2 Weeks",
      monthly: "Monthly",
      quarterly: "Quarterly",
      yearly: "Yearly"
    };
    return labels[freq] || freq;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-400" />
            Recurring Transfers
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "list" ? "default" : "outline"}
            onClick={() => setActiveTab("list")}
            className="flex-1"
          >
            Active Transfers ({recurringTransfers.filter(t => t.is_active !== false).length})
          </Button>
          <Button
            variant={activeTab === "create" ? "default" : "outline"}
            onClick={() => setActiveTab("create")}
            className="flex-1"
          >
            Create New
          </Button>
        </div>

        {activeTab === "list" ? (
          <div className="space-y-3">
            {recurringTransfers.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No recurring transfers set up</p>
                <Button onClick={() => setActiveTab("create")} className="bg-purple-600 hover:bg-purple-700">
                  Create Your First Transfer
                </Button>
              </div>
            ) : (
              recurringTransfers.map((transfer, index) => (
                <motion.div
                  key={transfer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-xl border ${
                    transfer.is_active === false
                      ? 'bg-gray-800/50 border-gray-700'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-semibold">
                          {transfer.memo || `Recurring ${transfer.type}`}
                        </h4>
                        <Badge className={`${
                          transfer.is_active === false
                            ? 'bg-gray-600 text-gray-300'
                            : transfer.status === 'scheduled'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {transfer.is_active === false ? 'Paused' : transfer.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${transfer.amount_usd?.toFixed(2) || '0.00'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getFrequencyLabel(transfer.frequency)}
                        </span>
                        {transfer.next_execution_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Next: {new Date(transfer.next_execution_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleMutation.mutate({ 
                          id: transfer.id, 
                          is_active: !transfer.is_active 
                        })}
                        className="bg-blue-500/10 border-blue-500/30 text-blue-400"
                      >
                        {transfer.is_active === false ? (
                          <><Play className="w-4 h-4" /></>
                        ) : (
                          <><Pause className="w-4 h-4" /></>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm("Cancel this recurring transfer?")) {
                            deleteMutation.mutate(transfer.id);
                          }
                        }}
                        className="bg-red-500/10 border-red-500/30 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {transfer.payment_method && (
                    <div className="text-xs text-gray-500">
                      Payment Method: {transfer.payment_method}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Transfer Type</label>
              <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Auto-Deposit (Add Money)</SelectItem>
                  <SelectItem value="withdrawal">Auto-Withdrawal (Cash Out)</SelectItem>
                  <SelectItem value="savings">Auto-Savings Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  className="pl-9 bg-white/5 border-white/10 text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Frequency</label>
              <Select value={formData.frequency} onValueChange={(val) => setFormData({...formData, frequency: val})}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Start Date</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="bg-white/5 border-white/10 text-white"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Payment Method</label>
              <Select value={formData.payment_method} onValueChange={(val) => setFormData({...formData, payment_method: val})}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="card">Debit Card</SelectItem>
                  <SelectItem value="wallet">In-App Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">Description (Optional)</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="e.g., Monthly savings"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-300 text-sm">
                <strong>Summary:</strong> ${formData.amount || '0.00'} will be automatically {formData.type === 'deposit' ? 'deposited' : 'withdrawn'} {getFrequencyLabel(formData.frequency).toLowerCase()} starting {formData.start_date ? new Date(formData.start_date).toLocaleDateString() : 'on the selected date'}.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("list")}
                className="flex-1 bg-white/5 border-white/10 text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {createMutation.isPending ? "Creating..." : "Create Recurring Transfer"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
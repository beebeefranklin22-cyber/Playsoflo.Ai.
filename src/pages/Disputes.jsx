import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, FileText, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Disputes() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [form, setForm] = useState({
    reference_type: "booking",
    reference_id: "",
    respondent_email: "",
    reason: "service_not_provided",
    description: "",
    amount_disputed: 0
  });

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ['disputes'],
    queryFn: () => base44.entities.Dispute.list('-created_date'),
    initialData: []
  });

  const createDisputeMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.Dispute.create({
        ...data,
        complainant_email: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      setShowForm(false);
      setForm({
        reference_type: "booking",
        reference_id: "",
        respondent_email: "",
        reason: "service_not_provided",
        description: "",
        amount_disputed: 0
      });
      alert("Dispute filed successfully. Our team will review it shortly.");
    }
  });

  const statusColors = {
    open: "bg-red-100 text-red-800",
    under_review: "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800"
  };

  const statusIcons = {
    open: AlertCircle,
    under_review: Clock,
    resolved: CheckCircle,
    closed: FileText
  };

  const reasonLabels = {
    service_not_provided: "Service Not Provided",
    incomplete_service: "Incomplete Service",
    quality_issue: "Quality Issue",
    payment_issue: "Payment Issue",
    cancellation_dispute: "Cancellation Dispute",
    other: "Other"
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <AlertCircle className="w-10 h-10 text-red-400" />
              Dispute Resolution
            </h1>
            <p className="text-gray-300 text-lg">Manage and resolve payment or service disputes</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-red-600 hover:bg-red-700"
          >
            File a Dispute
          </Button>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-500/10 border-blue-500/30 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold mb-2">How Dispute Resolution Works</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• File a dispute within 30 days of the transaction</li>
                  <li>• Our team reviews all evidence from both parties</li>
                  <li>• Resolution typically takes 3-7 business days</li>
                  <li>• Funds are held in escrow during the review</li>
                  <li>• Decision is final and binding</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Dispute Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="bg-white/5 border-white/10 mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">File a New Dispute</CardTitle>
                    <button onClick={() => setShowForm(false)}>
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Transaction Type</label>
                      <Select value={form.reference_type} onValueChange={(v) => setForm({...form, reference_type: v})}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="booking">Booking</SelectItem>
                          <SelectItem value="order">Order</SelectItem>
                          <SelectItem value="escrow">Escrow</SelectItem>
                          <SelectItem value="payment">Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Transaction ID</label>
                      <Input
                        placeholder="Enter transaction ID"
                        value={form.reference_id}
                        onChange={(e) => setForm({...form, reference_id: e.target.value})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Other Party Email</label>
                      <Input
                        placeholder="Provider or buyer email"
                        value={form.respondent_email}
                        onChange={(e) => setForm({...form, respondent_email: e.target.value})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Reason</label>
                      <Select value={form.reason} onValueChange={(v) => setForm({...form, reason: v})}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(reasonLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Amount Disputed ($)</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={form.amount_disputed}
                        onChange={(e) => setForm({...form, amount_disputed: parseFloat(e.target.value)})}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Description</label>
                    <textarea
                      placeholder="Provide detailed information about the dispute..."
                      value={form.description}
                      onChange={(e) => setForm({...form, description: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => createDisputeMutation.mutate(form)}
                      disabled={!form.reference_id || !form.respondent_email || !form.description || createDisputeMutation.isLoading}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      Submit Dispute
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Disputes List */}
        <div className="space-y-4">
          {disputes.length === 0 && !isLoading && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No disputes</h3>
              <p className="text-gray-400">You haven't filed any disputes. We hope it stays that way!</p>
            </div>
          )}

          {disputes.map((dispute, idx) => {
            const StatusIcon = statusIcons[dispute.status];
            
            return (
              <motion.div
                key={dispute.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 ${
                          dispute.status === 'resolved' ? 'bg-green-500/20' :
                          dispute.status === 'under_review' ? 'bg-yellow-500/20' :
                          'bg-red-500/20'
                        } rounded-full flex items-center justify-center`}>
                          <StatusIcon className={`w-6 h-6 ${
                            dispute.status === 'resolved' ? 'text-green-400' :
                            dispute.status === 'under_review' ? 'text-yellow-400' :
                            'text-red-400'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-white font-semibold text-lg">
                              {reasonLabels[dispute.reason]}
                            </h3>
                            <Badge className={statusColors[dispute.status]}>
                              {dispute.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm mb-2">
                            {dispute.reference_type} • ID: {dispute.reference_id}
                          </p>
                          <p className="text-gray-300 mb-3">
                            {dispute.description}
                          </p>
                          {dispute.amount_disputed > 0 && (
                            <div className="text-red-400 font-semibold">
                              Amount disputed: ${dispute.amount_disputed.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {dispute.resolution && (
                      <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-green-400 font-semibold">Resolution</span>
                        </div>
                        <p className="text-gray-300 text-sm">{dispute.resolution}</p>
                        {dispute.resolved_date && (
                          <p className="text-gray-400 text-xs mt-2">
                            Resolved on {new Date(dispute.resolved_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                      <span>
                        Filed {new Date(dispute.created_date).toLocaleDateString()}
                      </span>
                      <span>
                        vs. {dispute.respondent_email}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}